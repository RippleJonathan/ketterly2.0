// Material template types for auto-generating orders from measurements

import { MeasurementType, RoofMeasurements, CalculatedMaterialQuantity } from './materials'

export type TemplateCategory = 'roofing' | 'siding' | 'windows' | 'gutters' | 'other'

export interface TemplateItem {
  item: string              // "Shingles"
  unit: string              // "bundle"
  per_square: number        // DEPRECATED: Use material.default_per_unit instead (kept for backward compatibility)
  description: string       // "CertainTeed ClimateFlex Architectural"
}

export interface MaterialTemplate {
  id: string
  company_id: string
  
  // Template info
  name: string
  description: string | null
  category: string
  
  // Template configuration
  items: TemplateItem[]
  
  // Material count from junction table
  template_materials_count?: number
  
  // Metadata
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MaterialTemplateInsert {
  company_id: string
  name: string
  description?: string | null
  category?: string
  items: TemplateItem[]
  is_active?: boolean
  created_by?: string | null
}

export interface MaterialTemplateUpdate {
  name?: string
  description?: string | null
  category?: string
  items?: TemplateItem[]
  is_active?: boolean
}

export interface MaterialTemplateFilters {
  category?: string
  is_active?: boolean
  search?: string
}

// For generating order from template
export interface GeneratedOrderItem {
  description: string
  quantity: number
  unit: string
  measurement_type: MeasurementType
  measurement_value: number  // The actual measurement used (e.g., 25 squares)
  estimated_unit_cost: number | null
  estimated_total: number | null
}

export interface GenerateOrderFromTemplateParams {
  template_id: string
  measurements: RoofMeasurements  // All roof measurements
  estimated_costs?: Record<string, number> // { "material_id": 25.00 }
}

export interface ImportTemplateToOrderResult {
  order_id: string
  items: GeneratedOrderItem[]
  total_estimated: number
  warnings?: string[]  // e.g., "Missing ridge measurement for ridge cap calculation"
}
