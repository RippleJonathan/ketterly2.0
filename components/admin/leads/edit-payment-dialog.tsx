'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdatePayment } from '@/lib/hooks/use-invoices'
import { PaymentWithRelations, PaymentMethod } from '@/lib/types/invoices'
import { formatCurrency } from '@/lib/utils/formatting'
import { toast } from 'sonner'

interface EditPaymentDialogProps {
  payment: PaymentWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPaymentDialog({ payment, open, onOpenChange }: EditPaymentDialogProps) {
  const updatePayment = useUpdatePayment()

  const [formData, setFormData] = useState<{
    amount: string
    payment_date: string
    payment_method: PaymentMethod | ''
    reference_number: string
    notes: string
    cleared: boolean
    cleared_date: string
  }>({
    amount: '',
    payment_date: '',
    payment_method: '',
    reference_number: '',
    notes: '',
    cleared: false,
    cleared_date: '',
  })

  useEffect(() => {
    if (payment && open) {
      setFormData({
        amount: payment.amount.toString(),
        payment_date: payment.payment_date.split('T')[0],
        payment_method: payment.payment_method as PaymentMethod,
        reference_number: payment.reference_number || '',
        notes: payment.notes || '',
        cleared: payment.cleared || false,
        cleared_date: payment.cleared_date ? payment.cleared_date.split('T')[0] : '',
      })
    }
  }, [payment, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    await updatePayment.mutateAsync({
      paymentId: payment.id,
      updates: {
        amount,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method as PaymentMethod,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        cleared: formData.cleared,
        cleared_date: formData.cleared && formData.cleared_date ? formData.cleared_date : null,
      },
    })

    toast.success('Payment updated successfully')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment {payment.payment_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value as PaymentMethod })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="ach">ACH/Bank Transfer</SelectItem>
                <SelectItem value="wire">Wire Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Check #, transaction ID, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleared"
                checked={formData.cleared}
                onCheckedChange={(checked) => {
                  setFormData({
                    ...formData,
                    cleared: checked as boolean,
                    cleared_date: checked ? new Date().toISOString().split('T')[0] : '',
                  })
                }}
              />
              <Label htmlFor="cleared" className="cursor-pointer">
                Mark as cleared (bank approved)
              </Label>
            </div>

            {formData.cleared && (
              <div className="space-y-2">
                <Label>Cleared Date</Label>
                <Input
                  type="date"
                  value={formData.cleared_date}
                  onChange={(e) => setFormData({ ...formData, cleared_date: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePayment.isPending}>
              {updatePayment.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
