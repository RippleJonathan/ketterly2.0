'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { useSetLocationMaterialPrice, useRemoveLocationMaterialPrice } from '@/lib/hooks/use-location-material-pricing'
import { formatCurrency } from '@/lib/utils/formatting'

interface EditPriceDialogProps {
  material: {
    id: string
    name: string
    unit: string
    basePrice: number
    locationPrice: number
    hasOverride: boolean
  }
  locationId: string
  currentOverride: {
    id: string
    cost: number
    notes?: string
  } | null
  onClose: () => void
}

export function EditPriceDialog({
  material,
  locationId,
  currentOverride,
  onClose
}: EditPriceDialogProps) {
  const [cost, setCost] = useState(material.locationPrice.toString())
  const [notes, setNotes] = useState(currentOverride?.notes || '')
  const [isResetting, setIsResetting] = useState(false)
  
  const setPriceMutation = useSetLocationMaterialPrice()
  const removePriceMutation = useRemoveLocationMaterialPrice()
  
  const costNum = parseFloat(cost) || 0
  const isDirty = costNum !== material.locationPrice || notes !== (currentOverride?.notes || '')
  const isCustomPrice = costNum !== material.basePrice
  
  const handleSave = async () => {
    if (!cost || parseFloat(cost) <= 0) {
      alert('Please enter a valid price')
      return
    }
    
    await setPriceMutation.mutateAsync({
      location_id: locationId,
      material_id: material.id,
      cost: parseFloat(cost),
      notes: notes.trim() || undefined
    })
    
    onClose()
  }
  
  const handleResetToBase = async () => {
    if (!currentOverride) {
      onClose()
      return
    }
    
    if (!confirm(`Reset ${material.name} to base price (${formatCurrency(material.basePrice)})?`)) {
      return
    }
    
    setIsResetting(true)
    await removePriceMutation.mutateAsync(currentOverride.id)
    onClose()
  }
  
  const isPending = setPriceMutation.isPending || removePriceMutation.isPending

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Location Price</DialogTitle>
          <DialogDescription>
            Set custom pricing for <strong>{material.name}</strong> at this location
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Base price reference */}
          <div className="rounded-md border p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Company Base Price</p>
                <p className="text-xs text-muted-foreground">Global catalog price</p>
              </div>
              <div className="text-lg font-bold">{formatCurrency(material.basePrice)}</div>
            </div>
          </div>
          
          {/* Price input */}
          <div className="space-y-2">
            <Label htmlFor="cost">Location Price *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                / {material.unit}
              </span>
            </div>
            {isCustomPrice && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600">
                  {costNum > material.basePrice ? (
                    <>Markup: {formatCurrency(costNum - material.basePrice)} ({((costNum / material.basePrice - 1) * 100).toFixed(1)}%)</>
                  ) : (
                    <>Discount: {formatCurrency(material.basePrice - costNum)} ({((1 - costNum / material.basePrice) * 100).toFixed(1)}%)</>
                  )}
                </span>
              </div>
            )}
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Regional pricing adjustment, volume discount, etc."
              rows={3}
            />
          </div>
          
          {/* Status badge */}
          {material.hasOverride && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">⭐ Custom Price Active</Badge>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <div className="flex-1">
            {material.hasOverride && (
              <Button
                variant="outline"
                onClick={handleResetToBase}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {isResetting ? 'Resetting...' : 'Reset to Base'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || isPending}
            >
              {setPriceMutation.isPending ? 'Saving...' : 'Save Price'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
