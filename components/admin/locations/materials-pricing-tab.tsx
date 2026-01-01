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
import { Pencil, Search, Plus } from 'lucide-react'
import { useMaterials } from '@/lib/hooks/use-materials'
import { EditMaterialPricingDialog } from './edit-material-pricing-dialog'
import { MaterialDialog } from '@/components/admin/settings/material-dialog'
import { useLocationMaterialPricing } from '@/lib/hooks/use-location-material-pricing'
import { useLocationSupplierPricing } from '@/lib/hooks/use-locations'
import { formatCurrency } from '@/lib/utils/formatting'
import type { MaterialItemType } from '@/lib/types/materials'

interface MaterialsPricingTabProps {
  locationId: string
  itemType: MaterialItemType
}

export function MaterialsPricingTab({ locationId, itemType }: MaterialsPricingTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  
  // Fetch materials filtered by type
  const { data: materials, isLoading } = useMaterials({ item_type: itemType })
  
  // Fetch location-specific pricing (not used in UI, but needed for edit dialog)
  const { data: locationPricing } = useLocationMaterialPricing(locationId)
  const { data: supplierPricing } = useLocationSupplierPricing(locationId)
  
  // Filter by search
  const displayData = useMemo(() => {
    if (!materials?.data) return []
    
    return materials.data
      .filter(m => !m.deleted_at && m.is_active)
      .filter(item => {
        if (!searchTerm) return true
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      })
  }, [materials, searchTerm])
  
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }
  
  if (!materials?.data || materials.data.length === 0) {
    const typeLabel = itemType === 'estimate' ? 'estimate items' : itemType
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {typeLabel} found. Add {typeLabel} to your catalog first.
      </div>
    )
  }

  const typeLabel = itemType === 'estimate' ? 'Estimate Items' : 
                    itemType === 'material' ? 'Materials' : 'Labor'

  return (
    <div className="space-y-4">
      {/* Search & Add Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
      
      {/* Info */}
      <div className="text-sm text-muted-foreground">
        <p>
          Showing {displayData.length} {typeLabel.toLowerCase()} • 
          Click <strong>Cost</strong> to view/edit supplier-specific pricing
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              {itemType !== 'labor' && <TableHead>Manufacturer</TableHead>}
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {item.category}
                  </Badge>
                </TableCell>
                {itemType !== 'labor' && (
                  <TableCell className="text-muted-foreground">
                    {item.manufacturer || '—'}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-medium hover:text-blue-600 hover:underline"
                    onClick={() => setEditingMaterial(item)}
                  >
                    {formatCurrency(item.current_cost ?? 0)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit dialog */}
      {editingMaterial && (
        <EditMaterialPricingDialog
          material={editingMaterial}
          locationId={locationId}
          onClose={() => setEditingMaterial(null)}
        />
      )}
      
      {/* Material Creation Dialog */}
      <MaterialDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          // Dialog closes automatically on success via the material-dialog component
        }}
        material={null}
      />
    </div>
  )
}
