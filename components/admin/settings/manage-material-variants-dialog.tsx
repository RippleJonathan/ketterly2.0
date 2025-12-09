// Manage Material Variants Dialog
// UI for creating, editing, and organizing material variants (colors, sizes, finishes, etc.)

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useMaterialVariants,
  useCreateMaterialVariant,
  useUpdateMaterialVariant,
  useDeleteMaterialVariant,
  useSetDefaultVariant,
} from '@/lib/hooks/use-material-variants'
import type {
  MaterialVariant,
  VariantType,
} from '@/lib/types/material-variants'
import { VARIANT_TYPE_LABELS } from '@/lib/types/material-variants'
import { formatCurrency } from '@/lib/utils/formatting'
import { Trash2, Star, Plus, Palette } from 'lucide-react'
import { toast } from 'sonner'

interface ManageMaterialVariantsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  materialName: string
  baseCost: number
}

export function ManageMaterialVariantsDialog({
  open,
  onOpenChange,
  materialId,
  materialName,
  baseCost,
}: ManageMaterialVariantsDialogProps) {
  const { data: variants, isLoading } = useMaterialVariants(materialId)
  const createVariant = useCreateMaterialVariant()
  const updateVariant = useUpdateMaterialVariant()
  const deleteVariant = useDeleteMaterialVariant()
  const setDefault = useSetDefaultVariant()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    variant_name: '',
    variant_type: 'color' as VariantType,
    price_adjustment: 0,
    current_cost: null as number | null,
    is_available: true,
    is_default: false,
  })

  const resetForm = () => {
    setFormData({
      variant_name: '',
      variant_type: 'color',
      price_adjustment: 0,
      current_cost: null,
      is_available: true,
      is_default: false,
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (variant: MaterialVariant) => {
    setFormData({
      variant_name: variant.variant_name,
      variant_type: variant.variant_type,
      price_adjustment: variant.price_adjustment,
      current_cost: variant.current_cost,
      is_available: variant.is_available,
      is_default: variant.is_default,
    })
    setEditingId(variant.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.variant_name.trim()) {
      toast.error('Variant name is required')
      return
    }

    try {
      if (editingId) {
        await updateVariant.mutateAsync({
          variantId: editingId,
          updates: {
            variant_name: formData.variant_name,
            variant_type: formData.variant_type,
            price_adjustment: formData.price_adjustment,
            current_cost: formData.current_cost,
            is_available: formData.is_available,
          },
        })
      } else {
        await createVariant.mutateAsync({
          material_id: materialId,
          variant_name: formData.variant_name,
          variant_type: formData.variant_type,
          price_adjustment: formData.price_adjustment,
          current_cost: formData.current_cost,
          is_available: formData.is_available,
          is_default: formData.is_default,
        })
      }

      resetForm()
    } catch (error) {
      console.error('Error saving variant:', error)
    }
  }

  const handleDelete = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return

    try {
      await deleteVariant.mutateAsync(variantId)
    } catch (error) {
      console.error('Error deleting variant:', error)
    }
  }

  const handleSetDefault = async (variantId: string) => {
    try {
      await setDefault.mutateAsync({ materialId, variantId })
    } catch (error) {
      console.error('Error setting default variant:', error)
    }
  }

  const calculateEffectivePrice = (variant: typeof formData) => {
    if (variant.current_cost !== null && variant.current_cost > 0) {
      return variant.current_cost
    }
    return baseCost + variant.price_adjustment
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Variants - {materialName}</DialogTitle>
          <DialogDescription>
            Add color, size, and finish options for this material. Each variant
            can have its own pricing and SKU.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Variant List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Variants</h3>
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                disabled={showForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </div>

            <ScrollArea className="h-[500px] border rounded-md p-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !variants || variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No variants yet. Click "Add Variant" to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`p-3 rounded-lg border ${
                        variant.is_default ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {variant.variant_name}
                            </span>
                            {variant.is_default && (
                              <Star className="h-3 w-3 fill-blue-500 text-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {VARIANT_TYPE_LABELS[variant.variant_type]}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            {variant.current_cost !== null
                              ? formatCurrency(variant.current_cost)
                              : `${formatCurrency(baseCost)} ${
                                  variant.price_adjustment !== 0
                                    ? variant.price_adjustment > 0
                                      ? `+ ${formatCurrency(variant.price_adjustment)}`
                                      : `- ${formatCurrency(Math.abs(variant.price_adjustment))}`
                                    : ''
                                }`}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          {!variant.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(variant.id)}
                              title="Set as default"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(variant)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(variant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Variant Form */}
          <div>
            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-medium">
                  {editingId ? 'Edit Variant' : 'New Variant'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="variant_name">Variant Name *</Label>
                    <Input
                      id="variant_name"
                      value={formData.variant_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          variant_name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Weathered Wood, Large, Matte"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="variant_type">Variant Type</Label>
                    <Select
                      value={formData.variant_type}
                      onValueChange={(value: VariantType) =>
                        setFormData((prev) => ({
                          ...prev,
                          variant_type: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(VARIANT_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price_adjustment">
                        Price Adjustment
                      </Label>
                      <Input
                        id="price_adjustment"
                        type="number"
                        step="0.01"
                        value={formData.price_adjustment}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            price_adjustment: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        +/- from base cost
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="current_cost">Absolute Cost</Label>
                      <Input
                        id="current_cost"
                        type="number"
                        step="0.01"
                        value={formData.current_cost || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            current_cost: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          }))
                        }
                        placeholder="Leave blank to use adjustment"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Override base cost
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Effective Price: </span>
                      {formatCurrency(calculateEffectivePrice(formData))}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_available">Available</Label>
                    <Switch
                      id="is_available"
                      checked={formData.is_available}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_available: checked,
                        }))
                      }
                    />
                  </div>

                  {!editingId && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_default">Set as Default</Label>
                      <Switch
                        id="is_default"
                        checked={formData.is_default}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_default: checked,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      createVariant.isPending || updateVariant.isPending
                    }
                  >
                    {editingId ? 'Update' : 'Create'} Variant
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-center text-muted-foreground">
                <Palette className="h-12 w-12 mb-4" />
                <p>Select a variant to edit or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
