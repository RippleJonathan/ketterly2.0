'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePayment, useNextPaymentNumber } from '@/lib/hooks/use-invoices'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { PaymentInsert, PaymentMethod } from '@/lib/types/invoices'
import { formatCurrency } from '@/lib/utils/formatting'
import { Loader2 } from 'lucide-react'

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  invoice?: {
    id: string
    invoice_number: string
    balance_due: number
  }
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'ach', label: 'ACH' },
  { value: 'wire_transfer', label: 'Wire Transfer' },
  { value: 'financing', label: 'Financing' },
  { value: 'other', label: 'Other' },
]

export function RecordPaymentDialog({
  open,
  onOpenChange,
  leadId,
  invoice,
}: RecordPaymentDialogProps) {
  const { data: company } = useCurrentCompany()
  const { data: nextPaymentNumber } = useNextPaymentNumber()
  const createPayment = useCreatePayment()

  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: invoice?.balance_due?.toString() || '',
    payment_method: 'check' as PaymentMethod,
    reference_number: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form submitted', { company, nextPaymentNumber, data: nextPaymentNumber?.data })
    
    if (!company) {
      console.error('No company found')
      return
    }
    
    // The query returns the payment number directly, not in a .data property
    const paymentNumber = nextPaymentNumber
    if (!paymentNumber) {
      console.error('Payment number not available')
      return
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      console.error('Invalid payment amount')
      return
    }

    const payment: PaymentInsert = {
      company_id: company.id,
      lead_id: leadId,
      invoice_id: invoice?.id || null,
      payment_number: paymentNumber,
      payment_date: formData.payment_date,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      reference_number: formData.reference_number || null,
      notes: formData.notes || null,
    }

    console.log('Creating payment:', payment)
    try {
      await createPayment.mutateAsync(payment)
      onOpenChange(false)
    } catch (error) {
      console.error('Payment creation failed:', error)
    }
    
    // Reset form
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_method: 'check',
      reference_number: '',
      notes: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for this invoice to update the balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Info */}
          {invoice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">
                Invoice: {invoice.invoice_number}
              </p>
              <p className="text-lg font-semibold text-blue-900 mt-1">
                Balance Due: {formatCurrency(invoice.balance_due)}
              </p>
            </div>
          )}

          {/* Payment Number */}
          <div>
            <Label>Payment Number</Label>
            <Input
              value={nextPaymentNumber || 'Loading...'}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Payment Date */}
          <div>
            <Label>Payment Date *</Label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) =>
                setFormData({ ...formData, payment_date: e.target.value })
              }
              required
            />
          </div>

          {/* Amount */}
          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              placeholder="0.00"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label>Payment Method *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value: PaymentMethod) =>
                setFormData({ ...formData, payment_method: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div>
            <Label>Reference Number</Label>
            <Input
              value={formData.reference_number}
              onChange={(e) =>
                setFormData({ ...formData, reference_number: e.target.value })
              }
              placeholder="Check #, Transaction ID, etc."
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Add any notes about this payment..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createPayment.isPending}
              onClick={() => console.log('Button clicked!', { disabled: createPayment.isPending, paymentNumber: nextPaymentNumber })}
            >
              {createPayment.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
