// Material Variants Types
// Represents different variants of materials (colors, sizes, finishes, etc.)

export type VariantType = 'color' | 'size' | 'finish' | 'grade' | 'other'

export interface MaterialVariant {
  id: string
  company_id: string
  material_id: string
  
  // Variant details
  variant_name: string
  variant_type: VariantType
  
  // Visual
  color_hex: string | null
  
  // Pricing
  price_adjustment: number  // +/- from base material price
  current_cost: number | null  // Absolute price override
  
  // SKU/Ordering
  sku: string | null
  supplier_code: string | null
  
  // Availability
  is_available: boolean
  is_default: boolean
  
  // Metadata
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MaterialVariantInsert {
  material_id: string
  variant_name: string
  variant_type?: VariantType
  color_hex?: string | null
  price_adjustment?: number
  current_cost?: number | null
  sku?: string | null
  supplier_code?: string | null
  is_available?: boolean
  is_default?: boolean
  notes?: string | null
  sort_order?: number
}

export interface MaterialVariantUpdate {
  variant_name?: string
  variant_type?: VariantType
  color_hex?: string | null
  price_adjustment?: number
  current_cost?: number | null
  sku?: string | null
  supplier_code?: string | null
  is_available?: boolean
  is_default?: boolean
  notes?: string | null
  sort_order?: number
}

export interface MaterialVariantFilters {
  material_id?: string
  variant_type?: VariantType
  is_available?: boolean
  is_default?: boolean
}

// Helper to calculate effective price for a variant
export function getVariantPrice(
  baseMaterialCost: number,
  variant: MaterialVariant
): number {
  // If variant has absolute cost, use that
  if (variant.current_cost !== null && variant.current_cost > 0) {
    return variant.current_cost
  }
  
  // Otherwise apply price adjustment to base cost
  return baseMaterialCost + variant.price_adjustment
}

// Helper to format variant display name
export function formatVariantDisplayName(
  materialName: string,
  variantName: string
): string {
  return `${materialName} - ${variantName}`
}

// Variant type labels
export const VARIANT_TYPE_LABELS: Record<VariantType, string> = {
  color: 'Color',
  size: 'Size',
  finish: 'Finish',
  grade: 'Grade',
  other: 'Other',
}

// Common color options for quick selection
export const COMMON_SHINGLE_COLORS = [
  { name: 'Weathered Wood', hex: '#8B7355' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Black', hex: '#1C1C1C' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Brown', hex: '#6F4E37' },
  { name: 'Slate', hex: '#708090' },
  { name: 'Terra Cotta', hex: '#E07A5F' },
  { name: 'Harvest Blend', hex: '#B8860B' },
  { name: 'Colonial Slate', hex: '#556B2F' },
  { name: 'Driftwood', hex: '#A0826D' },
]
