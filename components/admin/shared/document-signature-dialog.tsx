'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignaturePad } from '@/components/ui/signature-pad'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

export interface DocumentSignatureData {
  signer_name: string
  signer_title?: string
  signature_data: string
}

interface DocumentSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: 'quote' | 'change-order' | 'invoice' | 'contract'
  documentNumber: string
  signerRole: 'company' | 'customer'
  defaultSignerName?: string
  defaultSignerTitle?: string
  onSubmit: (data: DocumentSignatureData) => Promise<void>
  submitButtonText?: string
  title?: string
  description?: string
}

export function DocumentSignatureDialog({
  open,
  onOpenChange,
  documentType,
  documentNumber,
  signerRole,
  defaultSignerName = '',
  defaultSignerTitle = '',
  onSubmit,
  submitButtonText,
  title,
  description,
}: DocumentSignatureDialogProps) {
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [signerTitle, setSignerTitle] = useState(defaultSignerTitle)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSignatureSave = (data: string) => {
    setSignatureData(data)
  }

  const handleSubmit = async () => {
    if (!signerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!signatureData) {
      toast.error('Please provide your signature')
      return
    }

    try {
      setSubmitting(true)

      await onSubmit({
        signer_name: signerName,
        signer_title: signerTitle,
        signature_data: signatureData,
      })

      const docTypeLabel = documentType === 'change-order' ? 'Change Order' : 
                           documentType.charAt(0).toUpperCase() + documentType.slice(1)
      toast.success(`${docTypeLabel} signed successfully!`)
      onOpenChange(false)
      
      // Reset form
      setSignatureData(null)
      setSignerName(defaultSignerName)
      setSignerTitle(defaultSignerTitle)
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign document')
    } finally {
      setSubmitting(false)
    }
  }

  // Generate default title and description if not provided
  const dialogTitle = title || `Sign ${documentType === 'change-order' ? 'Change Order' : 
                                        documentType.charAt(0).toUpperCase() + documentType.slice(1)} as ${
                                          signerRole === 'company' ? 'Company Representative' : 'Customer'
                                        }`
  
  const dialogDescription = description || `${documentType === 'change-order' ? 'Change Order' : 
                                              documentType.charAt(0).toUpperCase() + documentType.slice(1)} #${documentNumber} - Please sign below to ${
                                                signerRole === 'company' ? 'approve and finalize' : 'accept the terms'
                                              }`

  const buttonText = submitButtonText || `Sign ${documentType === 'change-order' ? 'Change Order' : 
                                           documentType.charAt(0).toUpperCase() + documentType.slice(1)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signer-name">Full Name *</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="signer-title">
                {signerRole === 'company' ? 'Title / Position' : 'Company (optional)'}
              </Label>
              <Input
                id="signer-title"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder={signerRole === 'company' ? 'e.g., Project Manager, Sales Rep' : 'e.g., ABC Construction'}
              />
            </div>
          </div>

          <div>
            <Label>Signature *</Label>
            <SignaturePad
              onSave={handleSignatureSave}
              width={700}
              height={200}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">By signing, you confirm:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                {signerRole === 'company' 
                  ? 'You are authorized to sign on behalf of the company'
                  : 'You have read and understood all terms and conditions'
                }
              </li>
              <li>
                You accept the terms and conditions of this {documentType === 'change-order' ? 'change order' : documentType}
              </li>
              <li>This signature is legally binding</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!signatureData || !signerName.trim() || submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {submitting ? 'Signing...' : buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
