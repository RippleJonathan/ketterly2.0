'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Presentation, FileText, AlertCircle } from 'lucide-react'
import type { PresentModalConfig, PresentModalSelection, FlowType } from '@/lib/types/presentations'

interface PresentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: PresentModalConfig
  onStartPresentation: (selection: PresentModalSelection) => void
}

export function PresentModal({ open, onOpenChange, config, onStartPresentation }: PresentModalProps) {
  const { lead_id, available_estimates, available_templates } = config

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedFlowType, setSelectedFlowType] = useState<FlowType>('retail')
  const [selectedEstimateIds, setSelectedEstimateIds] = useState<string[]>([])

  // Get the selected template to determine flow options
  const selectedTemplate = available_templates.find(t => t.id === selectedTemplateId)

  // Determine available flow types based on template
  const availableFlows: FlowType[] = selectedTemplate
    ? selectedTemplate.flow_type === 'both'
      ? ['retail', 'insurance']
      : [selectedTemplate.flow_type as FlowType]
    : ['retail', 'insurance']

  const canStartPresentation = selectedTemplateId && 
    (selectedFlowType === 'insurance' || selectedEstimateIds.length > 0)

  const handleStartPresentation = () => {
    if (!canStartPresentation) return

    const selection: PresentModalSelection = {
      template_id: selectedTemplateId,
      flow_type: selectedFlowType,
      estimate_ids: selectedEstimateIds,
    }

    onStartPresentation(selection)
  }

  const toggleEstimate = (estimateId: string) => {
    setSelectedEstimateIds(prev =>
      prev.includes(estimateId)
        ? prev.filter(id => id !== estimateId)
        : [...prev, estimateId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Presentation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Start Sales Presentation</DialogTitle>
              <DialogDescription>
                Configure your presentation settings below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label>Presentation Template</Label>
            {available_templates.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No presentation templates found. Please create a template in Settings.
                </AlertDescription>
              </Alert>
            ) : (
              <RadioGroup value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                {available_templates.map(template => (
                  <div key={template.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={template.id} id={template.id} />
                    <Label htmlFor={template.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground">{template.description}</div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {template.flow_type}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Flow Type Selection */}
          {selectedTemplateId && availableFlows.length > 1 && (
            <div className="space-y-3">
              <Label>Presentation Flow</Label>
              <RadioGroup value={selectedFlowType} onValueChange={(value) => setSelectedFlowType(value as FlowType)}>
                {availableFlows.includes('retail') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="retail" id="retail" />
                    <Label htmlFor="retail" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">Retail Flow</div>
                        <div className="text-sm text-muted-foreground">
                          Direct customer purchase with Good/Better/Best options
                        </div>
                      </div>
                    </Label>
                  </div>
                )}
                {availableFlows.includes('insurance') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="insurance" id="insurance" />
                    <Label htmlFor="insurance" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">Insurance Flow</div>
                        <div className="text-sm text-muted-foreground">
                          Insurance claim with contingency authorization
                        </div>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          {/* Estimate Selection (Retail only) */}
          {selectedTemplateId && selectedFlowType === 'retail' && (
            <div className="space-y-3">
              <Label>Select Estimates to Present</Label>
              {available_estimates.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No estimates found for this lead. Please create at least one estimate before presenting.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 rounded-lg border p-4">
                  {available_estimates.map(estimate => (
                    <div key={estimate.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={estimate.id}
                        checked={selectedEstimateIds.includes(estimate.id)}
                        onCheckedChange={() => toggleEstimate(estimate.id)}
                      />
                      <Label htmlFor={estimate.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>Quote #{estimate.quote_number}</span>
                          </div>
                          <span className="font-medium">
                            ${estimate.total.toLocaleString()}
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              {selectedEstimateIds.length === 0 && available_estimates.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Select 1-3 estimates to display as Good/Better/Best options
                </p>
              )}
            </div>
          )}

          {/* Insurance Note */}
          {selectedFlowType === 'insurance' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insurance presentations do not require estimate selection. The contingency authorization will be presented instead.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStartPresentation} disabled={!canStartPresentation}>
            <Presentation className="mr-2 h-4 w-4" />
            Start Presentation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
