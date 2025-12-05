// Supplier types for material suppliers and subcontractors

export type SupplierType = 'material_supplier' | 'subcontractor' | 'both'

export interface Supplier {
  id: string
  company_id: string
  
  // Basic info
  name: string
  type: SupplierType
  
  // Contact info
  contact_name: string | null
  email: string | null
  phone: string | null
  
  // Address
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  
  // Details
  notes: string | null
  is_active: boolean
  
  // Metadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SupplierInsert {
  company_id: string
  name: string
  type: SupplierType
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  notes?: string | null
  is_active?: boolean
}

export interface SupplierUpdate {
  name?: string
  type?: SupplierType
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  notes?: string | null
  is_active?: boolean
}

export interface SupplierFilters {
  type?: SupplierType
  is_active?: boolean
  search?: string
}
