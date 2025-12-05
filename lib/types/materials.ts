/**
 * Material Master System Types
 * Replaces embedded template items with reusable material catalog
 */

export type MaterialCategory = 
  | 'shingles'
  | 'underlayment'
  | 'ventilation'
  | 'flashing'
  | 'fasteners'
  | 'siding'
  | 'windows'
  | 'gutters'
  | 'other'

export type MaterialUnit = 
  | 'bundle'
  | 'roll'
  | 'box'
  | 'square'
  | 'linear_foot'
  | 'each'
  | 'sheet'
  | 'bag'

export interface Material {
  id: string
  company_id: string
  
  // Material identification
  name: string
  category: MaterialCategory
  manufacturer: string | null
  product_line: string | null
  sku: string | null
  
  // Pricing & units
  unit: MaterialUnit
  current_cost: number | null
  last_price_update: string | null
  
  // Supplier
  default_supplier_id: string | null
  
  // Default conversion
  default_per_square: number | null
  
  // Status
  is_active: boolean
  notes: string | null
  
  // Audit
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MaterialInsert {
  name: string
  category: MaterialCategory
  manufacturer?: string | null
  product_line?: string | null
  sku?: string | null
  unit: MaterialUnit
  current_cost?: number | null
  default_supplier_id?: string | null
  default_per_square?: number | null
  is_active?: boolean
  notes?: string | null
}

export interface MaterialUpdate {
  name?: string
  category?: MaterialCategory
  manufacturer?: string | null
  product_line?: string | null
  sku?: string | null
  unit?: MaterialUnit
  current_cost?: number | null
  last_price_update?: string | null
  default_supplier_id?: string | null
  default_per_square?: number | null
  is_active?: boolean
  notes?: string | null
}

export interface MaterialFilters {
  category?: MaterialCategory
  is_active?: boolean
  supplier_id?: string
  search?: string
}

/**
 * Junction table: Materials assigned to templates
 */
export interface TemplateMaterial {
  id: string
  template_id: string
  material_id: string
  per_square: number
  description: string | null
  sort_order: number
  created_at: string
  
  // Joined data (when querying with relations)
  material?: Material
}

export interface TemplateMaterialInsert {
  template_id: string
  material_id: string
  per_square: number
  description?: string | null
  sort_order?: number
}

export interface TemplateMaterialUpdate {
  per_square?: number
  description?: string | null
  sort_order?: number
}

/**
 * Material with full template context
 */
export interface MaterialWithTemplates extends Material {
  templates?: Array<{
    template_id: string
    template_name: string
    per_square: number
  }>
}

/**
 * Helper for material search/autocomplete
 */
export interface MaterialSearchResult {
  id: string
  name: string
  category: MaterialCategory
  manufacturer: string | null
  unit: MaterialUnit
  current_cost: number | null
  default_per_square: number | null
}

/**
 * Price history tracking (future enhancement)
 */
export interface MaterialPriceHistory {
  id: string
  material_id: string
  cost: number
  effective_date: string
  supplier_id: string | null
  notes: string | null
  created_at: string
}
