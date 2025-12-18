// Labor template types for auto-generating labor orders

export type LaborTemplateCategory = 'roofing' | 'siding' | 'windows' | 'gutters' | 'repairs' | 'other'

export interface TemplateLaborItem {
  id: string
  template_id: string
  description: string
  hours: number
  hourly_rate: number | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface LaborTemplate {
  id: string
  company_id: string
  
  // Template info
  name: string
  description: string | null
  category: LaborTemplateCategory
  
  // Metadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface LaborTemplateWithItems extends LaborTemplate {
  items: TemplateLaborItem[]
}

export interface LaborTemplateInsert {
  company_id: string
  name: string
  description?: string | null
  category: LaborTemplateCategory
}

export interface LaborTemplateUpdate {
  name?: string
  description?: string | null
  category?: LaborTemplateCategory
}

export interface TemplateLaborItemInsert {
  template_id: string
  description: string
  hours: number
  hourly_rate?: number | null
  notes?: string | null
  sort_order?: number
}

export interface TemplateLaborItemUpdate {
  description?: string
  hours?: number
  hourly_rate?: number | null
  notes?: string | null
  sort_order?: number
}

export interface LaborTemplateFilters {
  category?: LaborTemplateCategory
  search?: string
}

// For importing template into labor order
export interface ImportedLaborItem {
  description: string
  hours: number
  hourly_rate: number | null
  notes: string | null
  sort_order: number
}

export interface ImportTemplateToLaborOrderResult {
  order_id: string
  items: ImportedLaborItem[]
}
