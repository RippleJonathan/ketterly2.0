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
import { Pencil, Search } from 'lucide-react'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useLocationMaterialPricing, useSetLocationMaterialPrice, useRemoveLocationMaterialPrice } from '@/lib/hooks/use-location-material-pricing'
import { EditPriceDialog } from './edit-price-dialog'
import { formatCurrency } from '@/lib/utils/formatting'

interface LocationDefaultPricingTabProps {
  locationId: string
  isAdmin: boolean
}

export function LocationDefaultPricingTab({ locationId, isAdmin }: LocationDefaultPricingTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  
  // Fetch data
  const { data: materials, isLoading: materialsLoading } = useMaterials()
  const { data: locationPricing, isLoading: pricingLoading } = useLocationMaterialPricing(locationId)
  
  // Merge materials with location pricing
  const displayData = useMemo(() => {
    if (!materials?.data) return []
    
    return materials.data
      .filter(m => !m.deleted_at) // Active materials only
      .map(material => {
        const override = locationPricing?.data?.find((lp: any) => lp.material_id === material.id)
        return {
          ...material,
          basePrice: material.current_cost ?? 0,
          locationPrice: override?.cost ?? material.current_cost ?? 0,
          hasOverride: !!override,
          overrideId: override?.id,
          overrideNotes: override?.notes
        }
      })
      .filter(item => {
        if (!searchTerm) return true
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.item_type?.toLowerCase().includes(searchTerm.toLowerCase())
      })
  }, [materials, locationPricing, searchTerm])
  
  const isLoading = materialsLoading || pricingLoading
  
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading pricing data...</div>
  }
  
  if (!materials?.data || materials.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No materials found. Add materials to your catalog first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
        {isAdmin && (
          <p className="mb-2">
            <strong>Base Price:</strong> Company default pricing • 
            <strong className="ml-2">Location Price:</strong> This location's price
            <Badge variant="secondary" className="ml-2">⭐ = Custom pricing</Badge>
          </p>
        )}
        {!isAdmin && (
          <p className="mb-2">
            These are the prices for your location. Click ✏️ to customize.
          </p>
        )}
        <p className="text-xs">
          Showing {displayData.length} material{displayData.length !== 1 ? 's' : ''} • 
          {displayData.filter(d => d.hasOverride).length} custom price{displayData.filter(d => d.hasOverride).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Unit</TableHead>
              {isAdmin && <TableHead className="text-right">Base Price</TableHead>}
              <TableHead className="text-right">
                {isAdmin ? 'Location Price' : 'Price'}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {item.item_type || 'material'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {formatCurrency(item.basePrice)}
                  </TableCell>
                )}
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.locationPrice)}
                  {item.hasOverride && (
                    <Badge variant="secondary" className="ml-2">⭐</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMaterial(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit dialog */}
      {editingMaterial && (
        <EditPriceDialog
          material={editingMaterial}
          locationId={locationId}
          currentOverride={editingMaterial.hasOverride ? {
            id: editingMaterial.overrideId,
            cost: editingMaterial.locationPrice,
            notes: editingMaterial.overrideNotes
          } : null}
          onClose={() => setEditingMaterial(null)}
        />
      )}
    </div>
  )
}
