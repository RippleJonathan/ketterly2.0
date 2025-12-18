// Estimate Template Types
// Mirror of material-templates.ts for estimate templates

export interface EstimateTemplate {
  id: string
  company_id: string
  name: string
  description: string | null
  category: EstimateTemplateCategory
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type EstimateTemplateCategory = 
  | 'roofing'
  | 'siding' 
  | 'windows'
  | 'gutters'
  | 'repairs'
  | 'other'

export interface TemplateEstimateItem {
  id: string
  template_id: string
  material_id: string
  per_square: number
  description: string | null
  sort_order: number
  created_at: string
}

export interface TemplateEstimateItemWithMaterial extends TemplateEstimateItem {
  material: {
    id: string
    name: string
    category: string
    unit: string
    current_cost: number | null
    measurement_type: string | null
    default_per_square: number | null
  }
}

export interface EstimateTemplateWithItems extends EstimateTemplate {
  template_estimate_items: TemplateEstimateItemWithMaterial[]
}

export interface EstimateTemplateInsert {
  company_id: string
  name: string
  description?: string | null
  category: EstimateTemplateCategory
}

export interface EstimateTemplateUpdate {
  name?: string
  description?: string | null
  category?: EstimateTemplateCategory
}

export interface TemplateEstimateItemInsert {
  template_id: string
  material_id: string
  per_square: number
  description?: string | null
  sort_order?: number
}

export interface TemplateEstimateItemUpdate {
  per_square?: number
  description?: string | null
  sort_order?: number
}

// Calculation helper type
export interface EstimateTemplateCalculation {
  template_id: string
  template_name: string
  category: EstimateTemplateCategory
  company_id: string
  item_id: string
  per_square: number
  item_description: string | null
  sort_order: number
  material_id: string
  material_name: string
  unit: string
  current_cost: number | null
  measurement_type: string | null
  default_per_square: number | null
}
