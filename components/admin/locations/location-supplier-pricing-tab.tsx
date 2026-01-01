'use client'

import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useSuppliers } from '@/lib/hooks/use-suppliers'
import { useLocationSupplierPricing, useRemoveLocationSupplierPrice } from '@/lib/hooks/use-locations'
import { EditSupplierPriceDialog } from './edit-supplier-price-dialog'
import { formatCurrency } from '@/lib/utils/formatting'
import { toast } from 'sonner'

interface LocationSupplierPricingTabProps {
  locationId: string
  isAdmin: boolean
}

export function LocationSupplierPricingTab({ locationId, isAdmin }: LocationSupplierPricingTabProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPrice, setEditingPrice] = useState<any>(null)
  const [addingMaterial, setAddingMaterial] = useState(false)
  
  // Fetch data
  const { data: suppliers } = useSuppliers()
  const { data: supplierPricing, isLoading: pricingLoading } = useLocationSupplierPricing(
    locationId,
    selectedSupplierId || undefined
  )
  const removePriceMutation = useRemoveLocationSupplierPrice()
  
  // Filter pricing by search
  const displayData = useMemo(() => {
    if (!supplierPricing?.data) return []
    
    return supplierPricing.data.filter(item => {
      if (!searchTerm) return true
      return item.materials?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.supplier_sku?.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [supplierPricing, searchTerm])
  
  const handleRemovePrice = async (priceId: string, materialName: string) => {
    if (!confirm(`Remove supplier pricing for ${materialName}? This will revert to location default pricing.`)) {
      return
    }
    
    await removePriceMutation.mutateAsync({ priceId, locationId })
  }
  
  if (!suppliers?.data || suppliers.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No suppliers found. Add suppliers first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Supplier selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Select Supplier</label>
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a supplier..." />
            </SelectTrigger>
            <SelectContent>
              {suppliers.data
                .filter(s => !s.deleted_at)
                .map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedSupplierId && (
          <div className="pt-6">
            <Button
              onClick={() => setAddingMaterial(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </div>
        )}
      </div>
      
      {!selectedSupplierId ? (
        <div className="text-center py-12 text-muted-foreground">
          Select a supplier to view and manage their pricing for this location
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Info */}
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              Supplier-specific pricing for <strong>{suppliers.data.find(s => s.id === selectedSupplierId)?.name}</strong> at this location.
            </p>
            <p className="text-xs">
              Showing {displayData.length} material{displayData.length !== 1 ? 's' : ''} with supplier pricing
            </p>
          </div>

          {/* Table */}
          {pricingLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : displayData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              No supplier pricing configured. Click "Add Material" to set pricing.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Supplier SKU</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Min Order</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.materials?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {item.supplier_sku ? (
                          <Badge variant="outline">{item.supplier_sku}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.cost)}
                      </TableCell>
                      <TableCell>
                        {item.lead_time_days ? (
                          <span className="text-sm">{item.lead_time_days} days</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.minimum_order_qty ? (
                          <span className="text-sm">{item.minimum_order_qty}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {item.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPrice(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePrice(item.id, item.materials?.name || 'this material')}
                            disabled={removePriceMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      
      {/* Edit/Add dialog */}
      {(editingPrice || addingMaterial) && selectedSupplierId && (
        <EditSupplierPriceDialog
          locationId={locationId}
          supplierId={selectedSupplierId}
          existingPrice={editingPrice}
          onClose={() => {
            setEditingPrice(null)
            setAddingMaterial(false)
          }}
        />
      )}
    </div>
  )
}
