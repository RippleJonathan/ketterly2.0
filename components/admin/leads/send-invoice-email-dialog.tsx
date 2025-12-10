'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface SendInvoiceEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceNumber: string
  customerEmail?: string
  customerName?: string
  onSuccess?: () => void
}

export function SendInvoiceEmailDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  customerEmail,
  customerName,
  onSuccess,
}: SendInvoiceEmailDialogProps) {
  const queryClient = useQueryClient()
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    subject: '',
    message: '',
  })

  // Update form data when dialog opens with new customer info
  useEffect(() => {
    if (open) {
      setFormData({
        to: customerEmail || '',
        cc: '',
        subject: `Invoice ${invoiceNumber}`,
        message: `Dear ${customerName || 'Customer'},\n\nThank you for your business! Please find your invoice attached below.\n\nIf you have any questions, please don't hesitate to contact us.`,
      })
    }
  }, [open, customerEmail, customerName, invoiceNumber])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send email')
      }

      // Invalidate invoices query to refresh status
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      
      toast.success('Invoice sent successfully!')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Invoice via Email</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* To */}
          <div>
            <Label>To *</Label>
            <Input
              type="email"
              value={formData.to}
              onChange={(e) =>
                setFormData({ ...formData, to: e.target.value })
              }
              placeholder="customer@email.com"
              required
            />
          </div>

          {/* CC */}
          <div>
            <Label>CC (Optional)</Label>
            <Input
              type="email"
              value={formData.cc}
              onChange={(e) =>
                setFormData({ ...formData, cc: e.target.value })
              }
              placeholder="cc@email.com"
            />
          </div>

          {/* Subject */}
          <div>
            <Label>Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
            />
          </div>

          {/* Message */}
          <div>
            <Label>Message</Label>
            <Textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={6}
              placeholder="Add a personal message..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Invoice summary and payment details will be included automatically
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
