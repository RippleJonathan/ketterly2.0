'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMarkCommissionPaid } from '@/lib/hooks/use-lead-commissions'
import { LeadCommission } from '@/lib/types/commissions'
import { formatCurrency } from '@/lib/utils/formatting'
import { Loader2 } from 'lucide-react'

interface MarkCommissionPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commission: LeadCommission | null
  leadId: string
}

export function MarkCommissionPaidDialog({
  open,
  onOpenChange,
  commission,
  leadId,
}: MarkCommissionPaidDialogProps) {
  const markPaid = useMarkCommissionPaid()
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

  // Calculate remaining balance (calculated_amount - paid_amount)
  const paidAmount = commission?.paid_amount || 0
  const calculatedAmount = commission?.calculated_amount || 0
  const remainingBalance = calculatedAmount - paidAmount
  const hasPartialPayment = paidAmount > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commission) return

    const amount = paymentAmount ? parseFloat(paymentAmount) : undefined

    await markPaid.mutateAsync({
      id: commission.id,
      leadId,
      paymentAmount: amount,
      paymentNotes: paymentNotes || undefined,
    })

    onOpenChange(false)
    setPaymentNotes('')
    setPaymentAmount('')
  }

  if (!commission) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Commission as Paid</DialogTitle>
          <DialogDescription>
            Record payment for this commission. This will mark it as paid and update the payment date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Commission Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">User:</span>
              <span className="text-sm font-medium">{commission.user?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Commission:</span>
              <span className="text-lg font-bold">
                {formatCurrency(calculatedAmount)}
              </span>
            </div>
            {hasPartialPayment && (
              <>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-gray-600">Already Paid:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-900">Remaining Balance:</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-gray-600">Type:</span>
              <span className="text-sm font-medium">
                {commission.commission_type === 'percentage'
                  ? `${commission.commission_rate}%`
                  : commission.commission_type === 'flat_amount'
                  ? formatCurrency(commission.flat_amount || 0)
                  : 'Custom'}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <Label>Payment Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={remainingBalance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={formatCurrency(remainingBalance)}
            />
            <p className="text-xs text-gray-500 mt-1">
              {hasPartialPayment 
                ? `Enter amount to pay (max: ${formatCurrency(remainingBalance)} remaining)` 
                : `Leave blank to pay full amount (${formatCurrency(remainingBalance)})`}
            </p>
          </div>

          {/* Payment Date */}
          <div>
            <Label>Payment Date</Label>
            <Input
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Payment will be recorded as of today</p>
          </div>

          {/* Payment Notes */}
          <div>
            <Label>Payment Notes</Label>
            <Textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Optional notes about this payment (check number, transaction ID, etc.)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setPaymentNotes('')
                setPaymentAmount('')
              }}
              disabled={markPaid.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={markPaid.isPending}>
              {markPaid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {hasPartialPayment ? 'Record Payment' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
