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

interface CompanySignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quoteId: string
  quoteNumber: string
  defaultSignerName?: string
  onSuccess?: () => void
}

export function CompanySignatureDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNumber,
  defaultSignerName,
  onSuccess,
}: CompanySignatureDialogProps) {
  const [signerName, setSignerName] = useState(defaultSignerName || '')
  const [signerTitle, setSignerTitle] = useState('')
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

      const response = await fetch(`/api/quotes/${quoteId}/sign-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName,
          signer_title: signerTitle,
          signature_data: signatureData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      toast.success('Quote signed successfully!')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign quote')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sign Quote as Company Representative</DialogTitle>
          <DialogDescription>
            Quote #{quoteNumber} - Please sign below to finalize the contract
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company-signer-name">Full Name *</Label>
              <Input
                id="company-signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="company-signer-title">Title / Position</Label>
              <Input
                id="company-signer-title"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="e.g., Project Manager, Sales Rep"
              />
            </div>
          </div>

          <div>
            <Label>Company Representative Signature *</Label>
            <SignaturePad
              onSave={handleSignatureSave}
              width={700}
              height={200}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">By signing, you confirm:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>You are authorized to sign on behalf of the company</li>
              <li>You accept the terms and conditions of this quote</li>
              <li>This signature legally binds the company to the agreement</li>
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
              {submitting ? 'Signing...' : 'Sign Quote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
