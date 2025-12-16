'use client'

import { DocumentSignatureDialog, DocumentSignatureData } from '@/components/admin/shared/document-signature-dialog'

interface ChangeOrderSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  changeOrderId: string
  changeOrderNumber: string
  defaultSignerName?: string
  onSuccess?: () => void
}

export function ChangeOrderSignatureDialog({
  open,
  onOpenChange,
  changeOrderId,
  changeOrderNumber,
  defaultSignerName,
  onSuccess,
}: ChangeOrderSignatureDialogProps) {
  
  const handleSubmit = async (data: DocumentSignatureData) => {
    console.log('Submitting company signature for change order:', changeOrderId)
    
    const response = await fetch(`/api/change-orders/${changeOrderId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    console.log('Change order approval result:', result)
    
    onSuccess?.()
    console.log('onSuccess callback called')
  }

  return (
    <DocumentSignatureDialog
      open={open}
      onOpenChange={onOpenChange}
      documentType="change-order"
      documentNumber={changeOrderNumber}
      signerRole="company"
      defaultSignerName={defaultSignerName}
      onSubmit={handleSubmit}
      submitButtonText="Approve Change Order"
    />
  )
}
