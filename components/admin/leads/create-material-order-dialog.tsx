'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useTemplates } from '@/lib/hooks/use-material-templates'
import { useLeadMeasurements } from '@/lib/hooks/use-measurements'
import { useCreateEventFromMaterialOrder, useCreateEventFromLaborOrder } from '@/lib/hooks/use-calendar'
import { importTemplateToOrder } from '@/lib/api/material-orders'
import { MaterialTemplate } from '@/lib/types/material-templates'
import type { OrderType } from '@/lib/types/material-orders'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Package, Ruler } from 'lucide-react'
import { toast } from 'sonner'

interface CreateMaterialOrderDialogProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  leadAddress?: string
  orderType: OrderType
  onSuccess?: () => void
}

const methodSchema = z.object({
  method: z.enum(['template', 'manual']),
})

export function CreateMaterialOrderDialog({
  isOpen,
  onClose,
  leadId,
  leadAddress,
  orderType,
  onSuccess,
}: CreateMaterialOrderDialogProps) {
  const { data: company } = useCurrentCompany()
  const [step, setStep] = useState<'method' | 'template'>('method')
  const [selectedTemplate, setSelectedTemplate] = useState<MaterialTemplate | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  
  // Conditional labels based on order type
  const isMaterial = orderType === 'material'
  const orderLabel = isMaterial ? 'Material Order' : 'Work Order'

  // Calendar event creation hooks
  const createMaterialEvent = useCreateEventFromMaterialOrder()
  const createLaborEvent = useCreateEventFromLaborOrder()

  const { data: templatesResponse } = useTemplates({ is_active: true })
  const templates = templatesResponse?.data || []

  const { data: measurementsResponse } = useLeadMeasurements(leadId)
  const measurements = measurementsResponse?.data

  const { register, handleSubmit, watch, reset } = useForm({
    resolver: zodResolver(methodSchema),
    defaultValues: {
      method: 'template' as 'template' | 'manual',
    },
  })

  const method = watch('method')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('method')
      setSelectedTemplate(null)
      reset()
    }
  }, [isOpen, reset])

  const handleMethodSubmit = () => {
    if (method === 'template') {
      setStep('template')
    } else {
      // TODO: Navigate to manual order creation
      toast.info('Manual order creation coming soon')
      onClose()
    }
  }

  const handleTemplateSelect = (template: MaterialTemplate) => {
    setSelectedTemplate(template)
  }

  const handleCreateOrder = async () => {
    if (!selectedTemplate || !company || !measurements) return

    setIsImporting(true)
    try {
      // Import template with auto-calculated quantities
      const result = await importTemplateToOrder({
        companyId: company.id,
        leadId: leadId,
        order_type: orderType,
        template_id: selectedTemplate.id,
        supplier_id: null,
        order_date: null,
        expected_delivery_date: null,
        notes: null,
        measurements: {
          total_squares: measurements.total_squares || measurements.actual_squares || 0,
          hip_feet: measurements.hip_feet || 0,
          ridge_feet: measurements.ridge_feet || 0,
          valley_feet: measurements.valley_feet || 0,
          rake_feet: measurements.rake_feet || 0,
          eave_feet: measurements.eave_feet || 0,
          // Calculate totals if not provided by database
          hip_ridge_total: (measurements.hip_feet || 0) + (measurements.ridge_feet || 0),
          perimeter_total: (measurements.rake_feet || 0) + (measurements.eave_feet || 0),
        },
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      toast.success(
        `Created order with ${result.data?.items?.length || 0} items`
      )

      // Automatically create calendar event for the order
      if (result.data?.order?.id) {
        try {
          if (orderType === 'material') {
            await createMaterialEvent.mutateAsync(result.data.order.id)
            toast.success('Calendar event created for material delivery')
          } else if (orderType === 'work') {
            await createLaborEvent.mutateAsync(result.data.order.id)
            toast.success('Calendar event created for work order')
          }
        } catch (eventError: any) {
          // Don't block the flow if calendar event creation fails
          console.error('Failed to create calendar event:', eventError)
          toast.warning('Order created but calendar event could not be added')
        }
      }

      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast.error(`Failed to create order: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {/* Step 1: Choose Method */}
        {step === 'method' && (
          <>
            <DialogHeader>
              <DialogTitle>Create {orderLabel}</DialogTitle>
              <DialogDescription>
                Choose how you want to create the {orderLabel.toLowerCase()}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(handleMethodSubmit)} className="space-y-6">
              <RadioGroup
                value={method}
                onValueChange={(value) => reset({ method: value as 'template' | 'manual' })}
                className="space-y-4"
              >
                {/* Template Method */}
                <div
                  className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer hover:border-primary/50 transition-colors ${
                    method === 'template' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => reset({ method: 'template' })}
                >
                  <RadioGroupItem value="template" id="method-template" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="method-template" className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-5 w-5" />
                        <span className="font-semibold">Use Template</span>
                        <Badge variant="secondary">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Auto-calculate quantities from measurements using a pre-built template
                      </p>
                    </Label>
                  </div>
                </div>

                {/* Manual Method */}
                <div
                  className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer hover:border-primary/50 transition-colors ${
                    method === 'manual' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => reset({ method: 'manual' })}
                >
                  <RadioGroupItem value="manual" id="method-manual" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="method-manual" className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-5 w-5" />
                        <span className="font-semibold">Manual Entry</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Create a blank order and add materials manually
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  Continue
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Step 2: Select Template */}
        {step === 'template' && (
          <>
            <DialogHeader>
              <DialogTitle>Select {isMaterial ? 'Material' : 'Work'} Template</DialogTitle>
              <DialogDescription>
                Choose a template to auto-generate the order from measurements
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Measurements Info */}
              {measurements && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Project Measurements</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Squares:</span>{' '}
                      <span className="font-medium">
                        {measurements.total_squares || measurements.actual_squares || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hip+Ridge:</span>{' '}
                      <span className="font-medium">
                        {((measurements.hip_feet || 0) + (measurements.ridge_feet || 0)).toFixed(1)} LF
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Perimeter:</span>{' '}
                      <span className="font-medium">
                        {((measurements.rake_feet || 0) + (measurements.eave_feet || 0)).toFixed(1)} LF
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!measurements && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No measurements found. Add measurements to auto-calculate quantities.
                  </p>
                </div>
              )}

              {/* Template List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templates.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No templates available. Create one in Settings first.
                    </p>
                  </div>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{template.name}</h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{template.category}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {template.template_materials_count || 0} materials
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setStep('method')}>
                  Back
                </Button>
                <Button
                  onClick={handleCreateOrder}
                  disabled={!selectedTemplate || !measurements || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Order'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
