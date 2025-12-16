'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useNextChangeOrderNumber, useCreateChangeOrder } from '@/lib/hooks/use-invoices'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { formatCurrency } from '@/lib/utils/formatting'
import { Loader2 } from 'lucide-react'

interface GenerateChangeOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  quoteId: string
  totalChange: number
  changeDescription: string
}

export function GenerateChangeOrderDialog({
  open,
  onOpenChange,
  leadId,
  quoteId,
  totalChange,
  changeDescription,
}: GenerateChangeOrderDialogProps) {
  const { data: company } = useCurrentCompany()
  const { data: nextNumber } = useNextChangeOrderNumber()
  const createChangeOrder = useCreateChangeOrder()

  const [title, setTitle] = useState(`Quote Changes - ${new Date().toLocaleDateString()}`)
  const [description, setDescription] = useState(changeDescription)
  const [amount, setAmount] = useState(Math.abs(totalChange))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!company?.id || !nextNumber) return

    await createChangeOrder.mutateAsync({
      company_id: company.id,
      lead_id: leadId,
      quote_id: quoteId,
      change_order_number: nextNumber,
      title,
      description,
      amount,
      tax_rate: 0,
      tax_amount: 0,
      total: amount,
      status: 'pending',
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Change Order</DialogTitle>
          <DialogDescription>
            Create a change order for the modifications to this quote
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Change Order Number */}
          <div className="space-y-2">
            <Label>Change Order Number</Label>
            <Input
              value={nextNumber || 'Loading...'}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the changes made to the original contract..."
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-7"
                required
              />
            </div>
            <p className="text-sm text-gray-500">
              Change from contract: {formatCurrency(totalChange)}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createChangeOrder.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChangeOrder.isPending}>
              {createChangeOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Change Order'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
