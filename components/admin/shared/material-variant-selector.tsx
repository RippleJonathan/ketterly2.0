// Material Variant Selector Component
// Reusable dropdown for selecting material variants in orders, quotes, etc.

'use client'

import { useMaterialVariants } from '@/lib/hooks/use-material-variants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils/formatting'
import { getVariantPrice } from '@/lib/types/material-variants'

interface MaterialVariantSelectorProps {
  materialId: string
  materialName: string
  baseCost: number
  selectedVariantId: string | null
  onVariantChange: (variantId: string | null, effectivePrice: number) => void
  disabled?: boolean
}

export function MaterialVariantSelector({
  materialId,
  materialName,
  baseCost,
  selectedVariantId,
  onVariantChange,
  disabled = false,
}: MaterialVariantSelectorProps) {
  const { data: variants, isLoading } = useMaterialVariants(materialId, {
    is_available: true,
  })

  // If no variants exist, don't show the selector
  if (!variants || variants.length === 0) {
    return null
  }

  const handleValueChange = (value: string) => {
    if (value === 'none') {
      onVariantChange(null, baseCost)
    } else {
      const variant = variants.find((v) => v.id === value)
      if (variant) {
        const effectivePrice = getVariantPrice(baseCost, variant)
        onVariantChange(variant.id, effectivePrice)
      }
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="variant-select">Color/Variant</Label>
      <Select
        value={selectedVariantId || 'none'}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="variant-select">
          <SelectValue placeholder="Choose a color..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            No variant selected ({formatCurrency(baseCost)})
          </SelectItem>
          {variants.map((variant) => {
            const effectivePrice = getVariantPrice(baseCost, variant)
            return (
              <SelectItem key={variant.id} value={variant.id}>
                {variant.variant_name} ({formatCurrency(effectivePrice)})
                {variant.is_default && ' ⭐'}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
