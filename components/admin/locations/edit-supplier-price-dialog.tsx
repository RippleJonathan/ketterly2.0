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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useSetLocationSupplierPrice, useMaterialEffectivePrice } from '@/lib/hooks/use-locations'
import { formatCurrency } from '@/lib/utils/formatting'

interface EditSupplierPriceDialogProps {
  locationId: string
  supplierId: string
  existingPrice?: {
    id: string
    material_id: string
    cost: number
    supplier_sku?: string
    lead_time_days?: number
    minimum_order_qty?: number
    notes?: string
    materials?: { name: string; unit: string }
  } | null
  onClose: () => void
}

export function EditSupplierPriceDialog({
  locationId,
  supplierId,
  existingPrice,
  onClose
}: EditSupplierPriceDialogProps) {
  const [materialId, setMaterialId] = useState(existingPrice?.material_id || '')
  const [cost, setCost] = useState(existingPrice?.cost?.toString() || '')
  const [supplierSku, setSupplierSku] = useState(existingPrice?.supplier_sku || '')
  const [leadTimeDays, setLeadTimeDays] = useState(existingPrice?.lead_time_days?.toString() || '')
  const [minimumOrderQty, setMinimumOrderQty] = useState(existingPrice?.minimum_order_qty?.toString() || '')
  const [notes, setNotes] = useState(existingPrice?.notes || '')
  
  const { data: materials } = useMaterials()
  const { data: effectivePrice } = useMaterialEffectivePrice(
    materialId || undefined,
    locationId,
    undefined // Don't include supplier in price lookup
  )
  const setPriceMutation = useSetLocationSupplierPrice()
  
  const selectedMaterial = materials?.data?.find(m => m.id === materialId)
  const isEditing = !!existingPrice
  const canSave = materialId && cost && parseFloat(cost) > 0
  
  const handleSave = async () => {
    if (!canSave) {
      alert('Please select a material and enter a valid price')
      return
    }
    
    await setPriceMutation.mutateAsync({
      location_id: locationId,
      supplier_id: supplierId,
      material_id: materialId,
      cost: parseFloat(cost),
      supplier_sku: supplierSku.trim() || undefined,
      lead_time_days: leadTimeDays ? parseInt(leadTimeDays) : undefined,
      minimum_order_qty: minimumOrderQty ? parseFloat(minimumOrderQty) : undefined,
      notes: notes.trim() || undefined
    })
    
    onClose()
  }
  
  const isPending = setPriceMutation.isPending

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Supplier Price</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update pricing for ${existingPrice?.materials?.name || 'this material'}`
              : 'Add supplier-specific pricing for a material at this location'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Material selector (only for new) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {materials?.data
                    ?.filter(m => !m.deleted_at)
                    .map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.unit})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Reference pricing */}
          {materialId && effectivePrice?.data && (
            <div className="rounded-md border p-3 bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Location Default Price</p>
                  <p className="text-xs text-muted-foreground">
                    {effectivePrice.data.source === 'base' ? 'From global catalog' : 'Custom location price'}
                  </p>
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(effectivePrice.data.price)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {selectedMaterial?.unit}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {/* Cost */}
            <div className="space-y-2">
              <Label htmlFor="cost">Supplier Cost *</Label>
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
              </div>
              {cost && effectivePrice?.data && parseFloat(cost) < effectivePrice.data.price && (
                <p className="text-xs text-green-600">
                  Saves {formatCurrency(effectivePrice.data.price - parseFloat(cost))} vs location default
                </p>
              )}
            </div>
            
            {/* Supplier SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku">Supplier SKU</Label>
              <Input
                id="sku"
                value={supplierSku}
                onChange={(e) => setSupplierSku(e.target.value)}
                placeholder="SKU-12345"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Lead time */}
            <div className="space-y-2">
              <Label htmlFor="leadTime">Lead Time (days)</Label>
              <Input
                id="leadTime"
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="7"
              />
            </div>
            
            {/* Minimum order */}
            <div className="space-y-2">
              <Label htmlFor="minOrder">Minimum Order Qty</Label>
              <Input
                id="minOrder"
                type="number"
                step="0.01"
                min="0"
                value={minimumOrderQty}
                onChange={(e) => setMinimumOrderQty(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special terms, bulk discount details, etc."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isPending}
          >
            {isPending ? 'Saving...' : 'Save Price'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
