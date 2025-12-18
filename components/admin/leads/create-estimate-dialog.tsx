'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useEstimateTemplates } from '@/lib/hooks/use-estimate-templates'
import { EstimateTemplate } from '@/lib/types/estimate-templates'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { FileText, Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateEstimateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (templateId: string) => void
  onSelectBlank: () => void
}

const methodSchema = z.object({
  method: z.enum(['template', 'manual']),
})

export function CreateEstimateDialog({
  isOpen,
  onClose,
  onSelectTemplate,
  onSelectBlank,
}: CreateEstimateDialogProps) {
  const { data: company } = useCurrentCompany()
  const [step, setStep] = useState<'method' | 'template'>('method')
  const [selectedTemplate, setSelectedTemplate] = useState<EstimateTemplate | null>(null)

  const { data: templatesResponse, isLoading: isLoadingTemplates } = useEstimateTemplates({ is_active: true })
  const templates = templatesResponse?.data || []

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
      if (templates.length === 0) {
        toast.info('No templates available. Create a template in Settings first.')
        onClose()
        return
      }
      setStep('template')
    } else {
      // Create blank estimate
      onSelectBlank()
      onClose()
    }
  }

  const handleTemplateSelect = (template: EstimateTemplate) => {
    setSelectedTemplate(template)
  }

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return
    onSelectTemplate(selectedTemplate.id)
    onClose()
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      roofing: 'bg-red-100 text-red-800',
      siding: 'bg-orange-100 text-orange-800',
      windows: 'bg-cyan-100 text-cyan-800',
      gutters: 'bg-teal-100 text-teal-800',
      repairs: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {/* Step 1: Choose Method */}
        {step === 'method' && (
          <>
            <DialogHeader>
              <DialogTitle>Create Estimate</DialogTitle>
              <DialogDescription>
                Choose how you want to create the estimate
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
                        Start with pre-configured materials and line items from a template
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
                        <span className="font-semibold">Blank Estimate</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Create a blank estimate and add line items manually
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
              <DialogTitle>Select Estimate Template</DialogTitle>
              <DialogDescription>
                Choose a template to start with pre-configured line items
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No templates available. Create templates in Settings.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-primary/50 ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
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
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {template.item_count || 0} line items
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setStep('method')}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateFromTemplate}
                    disabled={!selectedTemplate}
                  >
                    Create from Template
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
