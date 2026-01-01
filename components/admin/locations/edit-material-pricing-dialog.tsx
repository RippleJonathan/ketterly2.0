'use client'

import { useState, useEffect, useMemo } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Save } from 'lucide-react'
import { useSuppliers } from '@/lib/hooks/use-suppliers'
import { useLocationSupplierPricing, useSetLocationSupplierPrice } from '@/lib/hooks/use-locations'
import { useSetLocationMaterialPrice, useLocationMaterialPricing } from '@/lib/hooks/use-location-material-pricing'
import { formatCurrency } from '@/lib/utils/formatting'
import { toast } from 'sonner'
import type { MaterialItemType } from '@/lib/types/materials'

interface EditMaterialPricingDialogProps {
  material: {
    id: string
    name: string
    unit: string
    current_cost: number | null
    category: string
    manufacturer?: string | null
    item_type: MaterialItemType
  }
  locationId: string
  onClose: () => void
}

export function EditMaterialPricingDialog({
  material,
  locationId,
  onClose
}: EditMaterialPricingDialogProps) {
  const [supplierPrices, setSupplierPrices] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  
  // Fetch all suppliers
  const { data: allSuppliers } = useSuppliers()
  
  // Filter suppliers based on material type
  const filteredSuppliers = useMemo(() => {
    if (!allSuppliers?.data) return []
    
    // For estimate items, no suppliers needed (just "Our Price")
    if (material.item_type === 'estimate') return []
    
    // For material items, show material suppliers
    if (material.item_type === 'material') {
      return allSuppliers.data.filter(s => 
        s.type === 'material_supplier' || s.type === 'both'
      )
    }
    
    // For labor items, show subcontractors
    if (material.item_type === 'labor') {
      return allSuppliers.data.filter(s => 
        s.type === 'subcontractor' || s.type === 'both'
      )
    }
    
    // For 'both' type, show all suppliers
    return allSuppliers.data
  }, [allSuppliers, material.item_type])
  
  // For estimate items, just show "Our Price" label
  const isEstimateItem = material.item_type === 'estimate'
  
  // Fetch existing pricing
  const { data: existingSupplierPricing } = useLocationSupplierPricing(locationId)
  const { data: existingLocationPricing } = useLocationMaterialPricing(locationId)
  
  // Mutations for saving prices
  const setSupplierPriceMutation = useSetLocationSupplierPrice()
  const setLocationPriceMutation = useSetLocationMaterialPrice()
  
  // Initialize prices from existing data
  useEffect(() => {
    const prices: Record<string, string> = {}
    
    if (isEstimateItem && existingLocationPricing?.data) {
      // For estimate items, load location default price
      const locationPrice = existingLocationPricing.data.find(
        p => p.material_id === material.id && !p.deleted_at
      )
      if (locationPrice) {
        prices['our_price'] = locationPrice.cost.toString()
      }
    } else if (existingSupplierPricing?.data && filteredSuppliers) {
      // For material/labor items, load supplier prices
      const materialPrices = existingSupplierPricing.data.filter(
        p => p.material_id === material.id && !p.deleted_at
      )
      
      materialPrices.forEach(price => {
        prices[price.supplier_id] = price.cost.toString()
      })
    }
    
    setSupplierPrices(prices)
  }, [existingSupplierPricing, existingLocationPricing, material.id, filteredSuppliers, isEstimateItem])
  
  const handlePriceChange = (supplierId: string, value: string) => {
    setSupplierPrices(prev => ({
      ...prev,
      [supplierId]: value
    }))
    setHasChanges(true)
  }
  
  const handleSave = async () => {
    try {
      // For estimate items, save to location_material_pricing (location default pricing)
      if (isEstimateItem) {
        const ourPrice = supplierPrices['our_price']
        if (ourPrice && parseFloat(ourPrice) > 0) {
          await setLocationPriceMutation.mutateAsync({
            location_id: locationId,
            material_id: material.id,
            cost: parseFloat(ourPrice)
          })
          toast.success('Price updated')
        } else {
          toast.error('Please enter a valid price')
          return
        }
      } else {
        // For material/labor items, save to supplier_material_pricing
        const updates = Object.entries(supplierPrices)
          .filter(([_, price]) => price && parseFloat(price) > 0)
          .map(([supplierId, price]) => 
            setSupplierPriceMutation.mutateAsync({
              location_id: locationId,
              supplier_id: supplierId,
              material_id: material.id,
              cost: parseFloat(price)
            })
          )
        
        await Promise.all(updates)
        toast.success('Supplier pricing updated')
      }
      
      onClose()
    } catch (error) {
      toast.error('Failed to update pricing')
    }
  }
  
  const activeSuppliers = filteredSuppliers.filter(s => !s.deleted_at && s.is_active) || []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEstimateItem ? 'Our Price' : 'Edit Supplier Pricing'}
          </DialogTitle>
          <DialogDescription>
            {isEstimateItem 
              ? `Set your company's price for ${material.name}.`
              : `Set supplier-specific prices for ${material.name}. Leave empty to use base cost.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Material Details */}
          <div className="rounded-md border p-4 bg-muted/50 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{material.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{material.category}</Badge>
                  {material.manufacturer && (
                    <span className="text-sm text-muted-foreground">{material.manufacturer}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Base Cost</div>
                <div className="text-lg font-bold">
                  {formatCurrency(material.current_cost ?? 0)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {material.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Pricing Table */}
          <div>
            <Label className="mb-2 block">
              {isEstimateItem ? 'Our Price' : 'Supplier Prices'}
            </Label>
            {isEstimateItem ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Price Type</TableHead>
                      <TableHead className="text-right">Price (per {material.unit})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Our Price</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={supplierPrices['our_price'] || ''}
                              onChange={(e) => handlePriceChange('our_price', e.target.value)}
                              className="pl-7 text-right"
                              placeholder={material.current_cost?.toFixed(2) || '0.00'}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : activeSuppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                No active suppliers found. Add suppliers first.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Price (per {material.unit})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSuppliers.map((supplier) => {
                      const currentPrice = supplierPrices[supplier.id] || ''
                      const priceNum = parseFloat(currentPrice) || 0
                      const baseCost = material.current_cost ?? 0
                      const savings = baseCost > 0 && priceNum > 0 ? baseCost - priceNum : 0
                      
                      return (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">
                            {supplier.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={currentPrice}
                                  onChange={(e) => handlePriceChange(supplier.id, e.target.value)}
                                  className="pl-7 text-right"
                                  placeholder="0.00"
                                />
                              </div>
                              {savings > 0 && (
                                <Badge variant="secondary" className="text-green-600">
                                  Saves {formatCurrency(savings)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> {isEstimateItem 
              ? 'Set your location-specific price for this estimate item.'
              : 'Leave a field blank to use the base cost for that supplier. Enter a price to override with supplier-specific pricing.'
            }
          </p>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={setSupplierPriceMutation.isPending || setLocationPriceMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || setSupplierPriceMutation.isPending || setLocationPriceMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {(setSupplierPriceMutation.isPending || setLocationPriceMutation.isPending) ? 'Saving...' : 'Save Pricing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
