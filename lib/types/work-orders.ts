// Work Order Types - Parallel to Material Orders for Subcontractor Labor
// Mirrors the structure of material-orders.ts

export type WorkOrderStatus = 
  | 'draft'        // Order created, no date set
  | 'scheduled'    // Date set, work scheduled
  | 'completed'    // Work finished
  | 'paid'         // Invoice paid in full
  | 'cancelled'    // Order cancelled (manual)

export type WorkOrderItemType = 'labor' | 'materials' | 'equipment' | 'other'

export type PaymentMethod = 
  | 'cash'
  | 'check'
  | 'credit_card'
  | 'wire_transfer'
  | 'company_account'
  | 'other'

// Subcontractor (parallel to Supplier)
export interface Subcontractor {
  id: string
  company_id: string
  
  // Basic Info
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  
  // Address
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  
  // Business Details
  trade_specialties: string[] | null // ['roofing', 'siding', 'gutters']
  license_number: string | null
  insurance_expiry: string | null // Date
  w9_on_file: boolean
  
  // Payment Terms
  payment_terms: string | null // 'Net 30', 'Net 15', etc.
  preferred_payment_method: string | null
  
  // Performance Tracking
  rating: number | null // 0-5 stars
  total_jobs_completed: number
  
  // Notes
  notes: string | null
  
  // Metadata
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SubcontractorInsert {
  company_id: string
  company_name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  trade_specialties?: string[] | null
  license_number?: string | null
  insurance_expiry?: string | null
  w9_on_file?: boolean
  payment_terms?: string | null
  preferred_payment_method?: string | null
  rating?: number | null
  notes?: string | null
  is_active?: boolean
}

export interface SubcontractorUpdate extends Partial<SubcontractorInsert> {
  id: string
}

// Work Order Line Item (parallel to MaterialOrderItem)
export interface WorkOrderLineItem {
  id: string
  work_order_id: string
  
  // Line Item Details
  item_type: WorkOrderItemType
  description: string
  
  // Quantity & Pricing
  quantity: number
  unit: string // 'hour', 'day', 'square', 'each'
  unit_price: number
  line_total: number
  
  // Notes
  notes: string | null
  
  // Ordering
  sort_order: number
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface WorkOrderLineItemInsert {
  work_order_id: string
  item_type: WorkOrderItemType
  description: string
  quantity: number
  unit?: string
  unit_price: number
  line_total: number
  notes?: string | null
  sort_order?: number
}

export interface WorkOrderLineItemUpdate extends Partial<WorkOrderLineItemInsert> {
  id: string
}

// Work Order (parallel to MaterialOrder)
export interface WorkOrder {
  id: string
  company_id: string
  lead_id: string | null
  
  // Subcontractor (OPTIONAL)
  subcontractor_id: string | null
  subcontractor_name: string | null
  subcontractor_email: string | null
  subcontractor_phone: string | null
  
  // Work Order Details
  work_order_number: string | null
  title: string
  description: string | null
  
  // Scheduling
  scheduled_date: string | null // Date
  estimated_duration_hours: number | null
  actual_start_date: string | null // Date
  actual_completion_date: string | null // Date
  
  // Location
  job_site_address: string
  job_site_city: string | null
  job_site_state: string | null
  job_site_zip: string | null
  
  // Pricing
  labor_cost: number
  materials_cost: number
  equipment_cost: number
  other_costs: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  include_tax: boolean // Whether to include tax in PDF and calculations
  
  // Status
  status: WorkOrderStatus
  
  // Materials Handling
  requires_materials: boolean
  materials_will_be_provided: boolean // true = company provides, false = sub provides
  
  // Payment Tracking
  is_paid: boolean
  payment_date: string | null
  payment_amount: number | null
  payment_method: PaymentMethod | null
  payment_notes: string | null
  
  // Communication
  last_emailed_at: string | null
  email_count: number
  
  // Notes
  internal_notes: string | null
  special_instructions: string | null
  
  // Safety
  insurance_verified: boolean
  safety_requirements: string | null
  
  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Relations (populated via joins)
  line_items?: WorkOrderLineItem[]
  subcontractor?: Subcontractor
}

export interface WorkOrderInsert {
  company_id: string
  lead_id?: string | null
  
  // Subcontractor (OPTIONAL)
  subcontractor_id?: string | null
  subcontractor_name?: string | null
  subcontractor_email?: string | null
  subcontractor_phone?: string | null
  
  // Work Order Details
  work_order_number?: string | null
  title: string
  description?: string | null
  
  // Scheduling
  scheduled_date?: string | null
  estimated_duration_hours?: number | null
  actual_start_date?: string | null
  actual_completion_date?: string | null
  
  // Location
  job_site_address: string
  job_site_city?: string | null
  job_site_state?: string | null
  job_site_zip?: string | null
  
  // Pricing
  labor_cost?: number
  materials_cost?: number
  equipment_cost?: number
  other_costs?: number
  subtotal: number
  tax_rate?: number
  tax_amount?: number
  total_amount: number
  include_tax?: boolean
  
  // Status
  status?: WorkOrderStatus
  
  // Materials
  requires_materials?: boolean
  materials_will_be_provided?: boolean
  
  // Notes
  internal_notes?: string | null
  special_instructions?: string | null
  
  // Safety
  insurance_verified?: boolean
  safety_requirements?: string | null
  
  created_by?: string | null
}

export interface WorkOrderUpdate extends Partial<WorkOrderInsert> {
  id: string
}

// Work Order with Relations
export interface WorkOrderWithRelations extends WorkOrder {
  line_items: WorkOrderLineItem[]
  subcontractor: Subcontractor | null
}

// For creating a complete work order with line items in one transaction
export interface CreateWorkOrderInput {
  work_order: WorkOrderInsert
  line_items: Omit<WorkOrderLineItemInsert, 'work_order_id'>[]
}

// Summary stats for subcontractor performance
export interface SubcontractorStats {
  subcontractor_id: string
  total_work_orders: number
  completed_work_orders: number
  total_value: number
  average_rating: number | null
  on_time_percentage: number | null
}

// Work order filters for list views
export interface WorkOrderFilters {
  status?: WorkOrderStatus | WorkOrderStatus[]
  subcontractor_id?: string
  lead_id?: string
  scheduled_date_from?: string
  scheduled_date_to?: string
  is_paid?: boolean
  search?: string // Search in title, description, subcontractor_name
}

// Constants
export const WORK_ORDER_STATUSES: { value: WorkOrderStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'accepted', label: 'Accepted', color: 'green' },
  { value: 'scheduled', label: 'Scheduled', color: 'purple' },
  { value: 'in_progress', label: 'In Progress', color: 'orange' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
]

export const WORK_ORDER_ITEM_TYPES: { value: WorkOrderItemType; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'wire_transfer', label: 'Wire Transfer' },
  { value: 'company_account', label: 'Company Account' },
  { value: 'other', label: 'Other' },
]

export const COMMON_LABOR_UNITS = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'square', label: 'Square (100 sq ft)' },
  { value: 'each', label: 'Each' },
  { value: 'job', label: 'Job (Flat Rate)' },
]

export const TRADE_SPECIALTIES = [
  'Roofing',
  'Siding',
  'Gutters',
  'Windows',
  'Doors',
  'Framing',
  'Drywall',
  'Painting',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Demolition',
  'Cleanup',
  'Other',
]
