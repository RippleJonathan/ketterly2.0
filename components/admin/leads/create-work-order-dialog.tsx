// Create Work Order Dialog
// Wrapper dialog that allows creating work orders from templates or manually

'use client'

import { useState, useEffect } from 'react'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FileText, Wrench, AlertCircle } from 'lucide-react'
import { WorkOrderForm } from './work-order-form'

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
  const [step, setStep] = useState<'method' | 'create'>('method')
  const [method, setMethod] = useState<CreationMethod>('manual')

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep('method')
      setMethod('manual')
    }
  }, [isOpen])

  const handleMethodSelect = () => {
    if (method === 'template') {
      // TODO: Template selection will be implemented later
      alert('Work order templates coming soon! For now, create manually.')
      return
    }
    setStep('create')
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

                {/* Template Option (Coming Soon) */}
                <div
                  className={`flex items-start space-x-4 rounded-lg border-2 p-4 opacity-50 ${
                    method === 'template'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted'
                  }`}
                >
                  <RadioGroupItem value="template" id="template" className="mt-1" disabled />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5" />
                      <Label htmlFor="template" className="text-base font-semibold">
                        Import from Template
                      </Label>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use a pre-configured template with common labor items
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
