// Material template types for auto-generating orders from measurements

export type TemplateCategory = 'roofing' | 'siding' | 'windows' | 'gutters' | 'other'

export interface TemplateItem {
  item: string              // "Shingles"
  unit: string              // "bundle"
  per_square: number        // 3.0
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
  estimated_unit_cost: number | null
}

export interface GenerateOrderFromTemplateParams {
  template_id: string
  squares: number
  estimated_costs?: Record<string, number> // { "Shingles": 25.00, "Underlayment": 85.00 }
}
