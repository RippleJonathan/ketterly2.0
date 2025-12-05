'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useMaterials, useDeleteMaterial } from '@/lib/hooks/use-materials'
import { Material } from '@/lib/types/materials'
import { MaterialDialog } from './material-dialog'

export function MaterialsSettings() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)

  const { data: materialsResponse, isLoading } = useMaterials({
    category: selectedCategory as any,
    search: searchQuery || undefined,
  })
  const deleteMaterial = useDeleteMaterial()

  const materials = materialsResponse?.data || []

  // Get unique categories from materials
  const categories = Array.from(new Set(materials.map(m => m.category)))

  const handleCreate = () => {
    setEditingMaterial(null)
    setDialogOpen(true)
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setDialogOpen(true)
  }

  const handleDelete = (material: Material) => {
    setMaterialToDelete(material)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (materialToDelete) {
      await deleteMaterial.mutateAsync(materialToDelete.id)
      setDeleteDialogOpen(false)
      setMaterialToDelete(null)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      shingles: 'bg-red-100 text-red-800',
      underlayment: 'bg-blue-100 text-blue-800',
      ventilation: 'bg-green-100 text-green-800',
      flashing: 'bg-yellow-100 text-yellow-800',
      fasteners: 'bg-purple-100 text-purple-800',
      siding: 'bg-orange-100 text-orange-800',
      windows: 'bg-cyan-100 text-cyan-800',
      gutters: 'bg-teal-100 text-teal-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Materials Library</h2>
          <p className="text-muted-foreground mt-1">
            Manage your reusable material catalog
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('')}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading materials...
        </div>
      ) : materials.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <PackageX className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No materials yet</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery
                  ? 'No materials match your search'
                  : 'Get started by creating your first material'}
              </p>
            </div>
            {!searchQuery && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Material
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => (
            <Card key={material.id} className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{material.name}</h3>
                  {material.manufacturer && (
                    <p className="text-sm text-muted-foreground">
                      {material.manufacturer}
                      {material.product_line && ` - ${material.product_line}`}
                    </p>
                  )}
                </div>
                <Badge className={getCategoryColor(material.category)}>
                  {material.category}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit:</span>
                  <span className="font-medium">{material.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">
                    {formatCurrency(material.current_cost)}
                  </span>
                </div>
                {material.default_per_square !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per Square:</span>
                    <span className="font-medium">{material.default_per_square}</span>
                  </div>
                )}
                {material.sku && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKU:</span>
                    <span className="font-mono text-xs">{material.sku}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(material)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDelete(material)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Material Dialog */}
      <MaterialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        material={editingMaterial}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{materialToDelete?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
