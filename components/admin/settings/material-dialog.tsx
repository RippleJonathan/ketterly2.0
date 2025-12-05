'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useCreateMaterial, useUpdateMaterial } from '@/lib/hooks/use-materials'
import { useSuppliers } from '@/lib/hooks/use-suppliers'
import { 
  Material, 
  MaterialCategory, 
  MaterialUnit,
  MeasurementType,
  getMeasurementTypeLabel,
  getMeasurementUnitDescription
} from '@/lib/types/materials'

const materialFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum([
    'shingles',
    'underlayment',
    'ventilation',
    'flashing',
    'fasteners',
    'siding',
    'windows',
    'gutters',
    'other',
  ]),
  manufacturer: z.string().optional(),
  product_line: z.string().optional(),
  sku: z.string().optional(),
  unit: z.enum([
    'bundle',
    'roll',
    'box',
    'square',
    'linear_foot',
    'each',
    'sheet',
    'bag',
  ]),
  measurement_type: z.enum([
    'square',
    'hip_ridge',
    'perimeter',
    'ridge',
    'valley',
    'rake',
    'eave',
    'each',
  ]).default('square'),
  current_cost: z.coerce.number().min(0).optional(),
  default_per_unit: z.coerce.number().min(0).optional(),
  default_per_square: z.coerce.number().min(0).optional(), // Backward compat
  default_supplier_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
})

type MaterialFormData = z.infer<typeof materialFormSchema>

interface MaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: Material | null
}

export function MaterialDialog({ open, onOpenChange, material }: MaterialDialogProps) {
  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()
  const { data: suppliersResponse } = useSuppliers()
  const suppliers = suppliersResponse?.data || []

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: '',
      category: 'shingles',
      manufacturer: '',
      product_line: '',
      sku: '',
      unit: 'bundle',
      measurement_type: 'square',
      current_cost: undefined,
      default_per_unit: undefined,
      default_per_square: undefined,
      default_supplier_id: null,
      notes: '',
    },
  })

  // Reset form when material changes
  useEffect(() => {
    if (material) {
      form.reset({
        name: material.name,
        category: material.category as MaterialCategory,
        manufacturer: material.manufacturer || '',
        product_line: material.product_line || '',
        sku: material.sku || '',
        unit: material.unit as MaterialUnit,
        measurement_type: (material.measurement_type as MeasurementType) || 'square',
        current_cost: material.current_cost || undefined,
        default_per_unit: material.default_per_unit || material.default_per_square || undefined,
        default_per_square: material.default_per_square || undefined,
        default_supplier_id: material.default_supplier_id || null,
        notes: material.notes || '',
      })
    } else {
      form.reset({
        name: '',
        category: 'shingles',
        manufacturer: '',
        product_line: '',
        sku: '',
        unit: 'bundle',
        measurement_type: 'square',
        current_cost: undefined,
        default_per_unit: undefined,
        default_per_square: undefined,
        default_supplier_id: null,
        notes: '',
      })
    }
  }, [material, form])

  const onSubmit = async (data: MaterialFormData) => {
    try {
      const payload = {
        name: data.name,
        category: data.category,
        manufacturer: data.manufacturer || null,
        product_line: data.product_line || null,
        sku: data.sku || null,
        unit: data.unit,
        measurement_type: data.measurement_type,
        current_cost: data.current_cost || null,
        default_per_unit: data.default_per_unit || null,
        default_per_square: data.default_per_unit || null, // For backward compat
        default_supplier_id: data.default_supplier_id || null,
        notes: data.notes || null,
      }

      if (material) {
        await updateMaterial.mutateAsync({ materialId: material.id, updates: payload })
      } else {
        await createMaterial.mutateAsync(payload)
      }

      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the hooks
      console.error('Failed to save material:', error)
    }
  }

  const categories: { value: MaterialCategory; label: string }[] = [
    { value: 'shingles', label: 'Shingles' },
    { value: 'underlayment', label: 'Underlayment' },
    { value: 'ventilation', label: 'Ventilation' },
    { value: 'flashing', label: 'Flashing' },
    { value: 'fasteners', label: 'Fasteners' },
    { value: 'siding', label: 'Siding' },
    { value: 'windows', label: 'Windows' },
    { value: 'gutters', label: 'Gutters' },
    { value: 'other', label: 'Other' },
  ]

  const units: { value: MaterialUnit; label: string }[] = [
    { value: 'bundle', label: 'Bundle' },
    { value: 'roll', label: 'Roll' },
    { value: 'box', label: 'Box' },
    { value: 'square', label: 'Square' },
    { value: 'linear_foot', label: 'Linear Foot' },
    { value: 'each', label: 'Each' },
    { value: 'sheet', label: 'Sheet' },
    { value: 'bag', label: 'Bag' },
  ]

  const measurementTypes: { value: MeasurementType; label: string; description: string }[] = [
    { value: 'square', label: 'Per Square', description: 'Qty × squares (e.g., 3 bundles × 25 squares)' },
    { value: 'hip_ridge', label: 'Per Hip + Ridge', description: 'Linear feet ÷ coverage (e.g., 100 LF ÷ 33 LF/bundle)' },
    { value: 'perimeter', label: 'Per Perimeter', description: 'Rake + Eave linear feet ÷ coverage' },
    { value: 'ridge', label: 'Per Ridge', description: 'Ridge linear feet ÷ coverage' },
    { value: 'valley', label: 'Per Valley', description: 'Valley linear feet ÷ coverage' },
    { value: 'rake', label: 'Per Rake', description: 'Rake linear feet ÷ coverage' },
    { value: 'eave', label: 'Per Eave', description: 'Eave linear feet ÷ coverage' },
    { value: 'each', label: 'Fixed Quantity', description: 'Always same qty (e.g., 1 drip edge coil)' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Material' : 'Create Material'}</DialogTitle>
          <DialogDescription>
            {material
              ? 'Update material details. Price changes will update the last updated timestamp.'
              : 'Add a new material to your catalog for reuse in templates.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Material Name *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., CertainTeed ClimateFlex Shingles"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={form.watch('category')}
                  onValueChange={(value) => form.setValue('category', value as MaterialCategory)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.category.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  value={form.watch('unit')}
                  onValueChange={(value) => form.setValue('unit', value as MaterialUnit)}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.unit && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.unit.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Product Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  {...form.register('manufacturer')}
                  placeholder="e.g., CertainTeed"
                />
              </div>

              <div>
                <Label htmlFor="product_line">Product Line</Label>
                <Input
                  id="product_line"
                  {...form.register('product_line')}
                  placeholder="e.g., ClimateFlex"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sku">SKU / Model Number</Label>
              <Input
                id="sku"
                {...form.register('sku')}
                placeholder="e.g., CT-CF-30YR"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Pricing & Usage</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current_cost">Current Cost ($)</Label>
                <Input
                  id="current_cost"
                  type="number"
                  step="0.01"
                  {...form.register('current_cost')}
                  placeholder="85.00"
                />
              </div>

              <div>
                <Label htmlFor="measurement_type">Measurement Type *</Label>
                <Select
                  value={form.watch('measurement_type')}
                  onValueChange={(value) => form.setValue('measurement_type', value as MeasurementType)}
                >
                  <SelectTrigger id="measurement_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Per Square (100 sq ft)</SelectItem>
                    <SelectItem value="hip_ridge">Per Hip + Ridge (linear feet)</SelectItem>
                    <SelectItem value="perimeter">Per Perimeter / Rake + Eave (LF)</SelectItem>
                    <SelectItem value="ridge">Per Ridge Only (linear feet)</SelectItem>
                    <SelectItem value="valley">Per Valley (linear feet)</SelectItem>
                    <SelectItem value="rake">Per Rake (linear feet)</SelectItem>
                    <SelectItem value="eave">Per Eave (linear feet)</SelectItem>
                    <SelectItem value="each">Fixed Quantity (each)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {getMeasurementTypeLabel(form.watch('measurement_type'))}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="default_per_unit">Default Quantity Per Unit</Label>
              <Input
                id="default_per_unit"
                type="number"
                step="0.01"
                {...form.register('default_per_unit')}
                placeholder={form.watch('measurement_type') === 'square' ? '3.0' : '33.0'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.watch('measurement_type') === 'square' 
                  ? 'Units needed per square (e.g., 3 bundles per square, or 0.05 if 1 box covers 20 squares)' 
                  : form.watch('measurement_type') === 'each'
                  ? 'Fixed quantity (e.g., 1 for always 1 unit)'
                  : 'Linear feet per unit (e.g., 4 feet per piece of ridge vent, 33 feet per roll)'}
              </p>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <Label htmlFor="default_supplier_id">Default Supplier (Optional)</Label>
            <Select
              value={form.watch('default_supplier_id') || ''}
              onValueChange={(value) => form.setValue('default_supplier_id', value === 'none' ? null : value)}
            >
              <SelectTrigger id="default_supplier_id">
                <SelectValue placeholder="Select a supplier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {suppliers.map((supplier: any) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Additional information about this material..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMaterial.isPending || updateMaterial.isPending}
            >
              {createMaterial.isPending || updateMaterial.isPending
                ? 'Saving...'
                : material
                ? 'Update Material'
                : 'Create Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
