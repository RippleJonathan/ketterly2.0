// Create Work Order Dialog
// Wrapper dialog that allows creating work orders from templates or manually

'use client'

import { useState, useEffect } from 'react'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useTemplates } from '@/lib/hooks/use-material-templates'
import { useLeadMeasurements } from '@/lib/hooks/use-measurements'
import { MaterialTemplate } from '@/lib/types/material-templates'
import { calculateMaterialQuantity } from '@/lib/types/materials'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Wrench, AlertCircle, Loader2 } from 'lucide-react'
import { WorkOrderForm } from './work-order-form'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface CreateWorkOrderDialogProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  leadAddress?: string
  onSuccess?: () => void
}

type CreationMethod = 'manual' | 'template'

export function CreateWorkOrderDialog({
  isOpen,
  onClose,
  leadId,
  leadAddress,
  onSuccess,
}: CreateWorkOrderDialogProps) {
  const { data: company } = useCurrentCompany()
  const [step, setStep] = useState<'method' | 'template' | 'create'>('method')
  const [method, setMethod] = useState<CreationMethod>('manual')
  const [selectedTemplate, setSelectedTemplate] = useState<MaterialTemplate | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { data: templatesResponse } = useTemplates({ is_active: true, item_type: 'labor' })
  const templates = templatesResponse?.data || []

  const { data: measurementsResponse } = useLeadMeasurements(leadId)
  const measurements = measurementsResponse?.data

  const supabase = createClient()

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep('method')
      setMethod('manual')
      setSelectedTemplate(null)
      setIsImporting(false)
    }
  }, [isOpen])

  const handleMethodSelect = () => {
    if (method === 'template') {
      if (!measurements) {
        toast.error('No measurements found for this lead. Please add measurements first.')
        return
      }
      setStep('template')
      return
    }
    setStep('create')
  }

  const handleTemplateSelect = (template: MaterialTemplate) => {
    setSelectedTemplate(template)
  }

  const handleImportTemplate = async () => {
    if (!selectedTemplate || !company || !measurements) return

    setIsImporting(true)
    try {
      // Fetch the full template with materials
      const { data: templateData, error: templateError } = await supabase
        .from('material_templates')
        .select(`
          *,
          template_materials:template_materials(
            id,
            measurement_type,
            per_unit,
            description,
            sort_order,
            material:materials(
              id,
              name,
              unit,
              current_cost,
              measurement_type,
              default_per_unit,
              default_per_square,
              item_type
            )
          )
        `)
        .eq('id', selectedTemplate.id)
        .eq('company_id', company.id)
        .single()

      if (templateError) throw templateError
      if (!templateData) throw new Error('Template not found')

      // Calculate work order totals
      let laborTotal = 0
      const lineItems: any[] = []

      for (const [index, tm] of (templateData.template_materials || []).entries()) {
        if (!tm.material) continue

        // Get measurement settings
        const measurementType = tm.material.measurement_type || 'square'
        const perUnit = tm.material.default_per_unit || tm.material.default_per_square || 1

        // Calculate quantity
        const calculatedQty = calculateMaterialQuantity(
          measurementType,
          perUnit,
          measurements
        )

        if (calculatedQty === 0) continue

        const quantity = Math.round(calculatedQty * 100) / 100
        const unitPrice = tm.material.current_cost || 0
        const lineTotal = quantity * unitPrice

        laborTotal += lineTotal

        lineItems.push({
          item_type: 'labor',
          description: tm.description || tm.material.name,
          quantity,
          unit: tm.material.unit || 'hour',
          unit_price: unitPrice,
          line_total: lineTotal,
          notes: `From template: ${selectedTemplate.name}`,
          sort_order: index,
        })
      }

      if (lineItems.length === 0) {
        throw new Error('No valid items could be calculated from this template')
      }

      // Create work order
      const taxRate = company.default_tax_rate || 0
      const subtotal = laborTotal
      const taxAmount = subtotal * taxRate
      const total = subtotal + taxAmount

      const { data: workOrder, error: workOrderError } = await supabase
        .from('work_orders')
        .insert({
          company_id: company.id,
          lead_id: leadId,
          title: selectedTemplate.name,
          description: selectedTemplate.description || null,
          status: 'draft',
          job_site_address: leadAddress || null,
          labor_cost: laborTotal,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: total,
        })
        .select()
        .single()

      if (workOrderError) throw workOrderError

      // Add line items
      const itemsToInsert = lineItems.map(item => ({
        ...item,
        work_order_id: workOrder.id,
      }))

      const { error: itemsError } = await supabase
        .from('work_order_line_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast.success(`Created work order with ${lineItems.length} items`)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error importing template:', error)
      toast.error(`Failed to create work order: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleSuccess = (workOrderId: string) => {
    onSuccess?.()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'method' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Work Order</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as CreationMethod)}>
                {/* Manual Option */}
                <div
                  className={`flex items-start space-x-4 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    method === 'manual'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setMethod('manual')}
                >
                  <RadioGroupItem value="manual" id="manual" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="h-5 w-5" />
                      <Label htmlFor="manual" className="text-base font-semibold cursor-pointer">
                        Create Manually
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start with a blank work order and add line items one by one
                    </p>
                  </div>
                </div>

                {/* Template Option */}
                <div
                  className={`flex items-start space-x-4 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    method === 'template'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setMethod('template')}
                >
                  <RadioGroupItem value="template" id="template" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5" />
                      <Label htmlFor="template" className="text-base font-semibold cursor-pointer">
                        Import from Template
                      </Label>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Auto-calculate quantities from measurements using labor templates
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Subcontractors Required
                  </p>
                  <p className="text-sm text-blue-700">
                    Make sure you have subcontractors set up before creating work orders.
                    You can manage subcontractors in Settings.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleMethodSelect}>
                  Continue
                </Button>
              </div>
            </div>
          </>
        ) : step === 'template' ? (
          <>
            <DialogHeader>
              <DialogTitle>Select Labor Template</DialogTitle>
              <DialogDescription>
                Choose a template to auto-calculate labor quantities from measurements
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!measurements && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No measurements found for this lead. Templates require measurements to calculate quantities.
                  </p>
                </div>
              )}

              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No labor templates found</p>
                  <p className="text-sm mt-1">Create templates in Settings to use this feature</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{template.name}</h4>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {template.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {template.template_materials_count || 0} labor items
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep('method')}>
                  Back
                </Button>
                <Button
                  onClick={handleImportTemplate}
                  disabled={!selectedTemplate || isImporting || !measurements}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Work Order'
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create Work Order - Manual</DialogTitle>
            </DialogHeader>

            <WorkOrderForm
              companyId={company?.id || ''}
              leadId={leadId}
              jobSiteAddress={leadAddress}
              defaultTaxRate={company?.default_tax_rate || 0}
              onSuccess={handleSuccess}
              onCancel={onClose}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
