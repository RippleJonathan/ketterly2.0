// Material order types for tracking orders and costs

export type OrderType = 'material' | 'work'

export type MaterialOrderStatus = 
  | 'draft'
  | 'ordered'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

export interface MaterialOrder {
  id: string
  company_id: string
  lead_id: string
  
  // Order identification
  order_number: string
  order_type: OrderType
  
  // Supplier
  supplier_id: string | null
  supplier?: any // Will be populated with Supplier type from join
  
  // Template used
  template_id: string | null
  template_name: string | null
  
  // Status workflow
  status: MaterialOrderStatus
  
  // Dates
  order_date: string | null
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  
  // Totals (auto-calculated from line items)
  total_estimated: number
  total_actual: number
  
  // Tax
  tax_rate: number
  tax_amount: number
  total_with_tax: number
  
  // Notes
  notes: string | null
  delivery_notes: string | null
  
  // Delivery method
  is_pickup: boolean
  
  // Payment tracking
  is_paid: boolean
  payment_date: string | null
  payment_amount: number | null
  payment_method: string | null
  payment_notes: string | null
  
  // Email tracking
  last_emailed_at: string | null
  email_count: number
  
  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Relations (populated via joins)
  items?: MaterialOrderItem[]
  invoices?: OrderInvoice[]
}

export interface MaterialOrderItem {
  id: string
  order_id: string
  
  // Item details
  description: string
  quantity: number
  unit: string
  
  // Material & Variant references
  material_id: string | null
  variant_id: string | null
  variant_name: string | null
  
  // Costs
  estimated_unit_cost: number | null
  actual_unit_cost: number | null
  estimated_total: number // Generated column
  actual_total: number    // Generated column
  
  // Optional link to quote line item
  quote_line_item_id: string | null
  
  // Metadata
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderInvoice {
  id: string
  company_id: string
  order_id: string
  
  // Invoice info
  invoice_number: string | null
  invoice_date: string | null
  amount: number
  
  // Document
  document_url: string | null
  document_name: string | null
  
  // Status
  is_paid: boolean
  paid_date: string | null
  payment_method: string | null
  
  // Metadata
  notes: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface MaterialOrderInsert {
  company_id: string
  lead_id: string
  supplier_id?: string | null
  template_id?: string | null
  template_name?: string | null
  status?: MaterialOrderStatus
  order_date?: string | null
  expected_delivery_date?: string | null
  notes?: string | null
  created_by?: string | null
}

export interface MaterialOrderUpdate {
  supplier_id?: string | null
  status?: MaterialOrderStatus
  order_date?: string | null
  expected_delivery_date?: string | null
  actual_delivery_date?: string | null
  notes?: string | null
  delivery_notes?: string | null
}

export interface MaterialOrderItemInsert {
  order_id: string
  description: string
  quantity: number
  unit: string
  estimated_unit_cost?: number | null
  actual_unit_cost?: number | null
  material_id?: string | null
  variant_id?: string | null
  variant_name?: string | null
  quote_line_item_id?: string | null
  notes?: string | null
}

export interface MaterialOrderItemUpdate {
  description?: string
  quantity?: number
  unit?: string
  estimated_unit_cost?: number | null
  actual_unit_cost?: number | null
  material_id?: string | null
  variant_id?: string | null
  variant_name?: string | null
  notes?: string | null
}

export interface OrderInvoiceInsert {
  company_id: string
  order_id: string
  invoice_number?: string | null
  invoice_date?: string | null
  amount: number
  document_url?: string | null
  document_name?: string | null
  is_paid?: boolean
  paid_date?: string | null
  payment_method?: string | null
  notes?: string | null
  uploaded_by?: string | null
}

export interface OrderInvoiceUpdate {
  invoice_number?: string | null
  invoice_date?: string | null
  amount?: number
  is_paid?: boolean
  paid_date?: string | null
  payment_method?: string | null
  notes?: string | null
}

export interface MaterialOrderFilters {
  lead_id?: string
  supplier_id?: string
  status?: MaterialOrderStatus
  search?: string
}

// For profit margin calculations
export interface ProfitMarginData {
  quoted_amount: number
  total_estimated: number
  total_actual: number
  estimated_profit: number
  actual_profit: number
  estimated_margin_percent: number
  actual_margin_percent: number
  variance: number
  variance_percent: number
}
