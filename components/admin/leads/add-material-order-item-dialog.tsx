'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/formatting'
import { addMaterialOrderItem } from '@/lib/api/material-orders'
import { toast } from 'sonner'

interface AddMaterialOrderItemDialogProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  onSuccess?: () => void
}

export function AddMaterialOrderItemDialog({
  isOpen,
  onClose,
  orderId,
  onSuccess,
}: AddMaterialOrderItemDialogProps) {
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 0,
    unit: 'EA',
    estimated_unit_cost: 0,
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setNewItem({
      description: '',
      quantity: 0,
      unit: 'EA',
      estimated_unit_cost: 0,
      notes: '',
    })
    onClose()
  }

  const handleAddItem = async () => {
    if (!newItem.description || newItem.quantity <= 0) {
      toast.error('Please provide description and quantity')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await addMaterialOrderItem(orderId, newItem)

      if (result.error) {
        toast.error('Failed to add item')
        return
      }

      toast.success('Item added successfully')
      handleClose()
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to add item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="new-description">Description</Label>
            <Input
              id="new-description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              placeholder="e.g., Shingles, Nails, Ridge Cap"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-quantity">Quantity</Label>
            <Input
              id="new-quantity"
              type="number"
              step="1"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-unit">Unit</Label>
            <Input
              id="new-unit"
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              placeholder="EA, SQ, LF, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-cost">Unit Cost</Label>
            <Input
              id="new-cost"
              type="number"
              step="0.01"
              value={newItem.estimated_unit_cost}
              onChange={(e) => setNewItem({ ...newItem, estimated_unit_cost: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-total">Total</Label>
            <Input
              id="new-total"
              value={formatCurrency(newItem.quantity * newItem.estimated_unit_cost)}
              disabled
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="new-notes">Notes (Optional)</Label>
            <Input
              id="new-notes"
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              placeholder="Additional details..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAddItem} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
