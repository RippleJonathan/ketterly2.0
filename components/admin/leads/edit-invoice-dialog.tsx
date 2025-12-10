'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateInvoice } from '@/lib/hooks/use-invoices'
import { CustomerInvoiceWithRelations } from '@/lib/types/invoices'
import { formatCurrency } from '@/lib/utils/formatting'
import { toast } from 'sonner'

interface EditInvoiceDialogProps {
  invoice: CustomerInvoiceWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
  const updateInvoice = useUpdateInvoice()

  const [formData, setFormData] = useState({
    invoice_date: '',
    due_date: '',
    payment_terms: '',
    notes: '',
  })

  useEffect(() => {
    if (invoice && open) {
      setFormData({
        invoice_date: invoice.invoice_date.split('T')[0],
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        payment_terms: invoice.payment_terms || '',
        notes: invoice.notes || '',
      })
    }
  }, [invoice, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await updateInvoice.mutateAsync({
      invoiceId: invoice.id,
      updates: {
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        payment_terms: formData.payment_terms || null,
        notes: formData.notes || null,
      },
    })

    toast.success('Invoice updated successfully')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Invoice {invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Select
              value={formData.payment_terms}
              onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
                <SelectItem value="50% deposit, 50% on completion">50% deposit, 50% on completion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-medium">{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-2">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balance_due)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateInvoice.isPending}>
              {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
