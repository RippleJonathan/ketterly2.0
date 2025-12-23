// Invoice & Payment Type Definitions

export type InvoiceStatus = 
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void'

export type PaymentMethod = 
  | 'cash'
  | 'check'
  | 'credit_card'
  | 'debit_card'
  | 'ach'
  | 'wire_transfer'
  | 'financing'
  | 'other'

export type ChangeOrderStatus = 
  | 'pending'
  | 'sent'
  | 'pending_company_signature'
  | 'approved'
  | 'declined'
  | 'cancelled'

export type CommissionType = 
  | 'sale'
  | 'bonus'
  | 'override'
  | 'referral'

export type CommissionStatus = 
  | 'pending'
  | 'approved'
  | 'paid'
  | 'cancelled'

// =============================================
// CHANGE ORDERS
// =============================================

export interface ChangeOrder {
  id: string
  company_id: string
  lead_id: string
  quote_id: string | null
  change_order_number: string
  title: string
  description: string | null
  amount: number
  tax_rate: number
  tax_amount: number
  total: number
  status: ChangeOrderStatus
  approved_at: string | null
  approved_by: string | null
  declined_at: string | null
  declined_reason: string | null
  customer_signature_url: string | null
  customer_signed_at: string | null
  company_signature_date: string | null
  company_signature_data: string | null
  company_signer_name: string | null
  company_signer_title: string | null
  customer_signature_data: string | null
  customer_signer_name: string | null
  share_token: string | null
  share_token_created_at: string | null
  share_link_expires_at: string | null
  sent_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ChangeOrderLineItem {
  id: string
  change_order_id: string
  company_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  category: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ChangeOrderWithRelations extends ChangeOrder {
  lead?: {
    full_name: string
    email: string
  }
  quote?: {
    quote_number: string
    title: string
  }
  approved_by_user?: {
    full_name: string
  }
  created_by_user?: {
    full_name: string
  }
  line_items?: ChangeOrderLineItem[]
}

export interface ChangeOrderInsert {
  company_id: string
  lead_id: string
  quote_id?: string | null
  change_order_number: string
  title: string
  description?: string | null
  amount: number
  tax_rate?: number
  tax_amount?: number
  total: number
  status?: ChangeOrderStatus
  notes?: string | null
  created_by?: string | null
}

export interface ChangeOrderUpdate {
  title?: string
  description?: string | null
  amount?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  status?: ChangeOrderStatus
  approved_at?: string | null
  approved_by?: string | null
  declined_at?: string | null
  declined_reason?: string | null
  notes?: string | null
}

// =============================================
// CUSTOMER INVOICES
// =============================================

export interface CustomerInvoice {
  id: string
  company_id: string
  lead_id: string
  quote_id: string | null
  invoice_number: string
  invoice_date: string
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number // Generated column
  status: InvoiceStatus
  pdf_url: string | null
  sent_to_email: string | null
  sent_at: string | null
  last_viewed_at: string | null
  payment_terms: string | null
  late_fee_percentage: number
  notes: string | null
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CustomerInvoiceWithRelations extends CustomerInvoice {
  lead?: {
    full_name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zip: string
  }
  quote?: {
    quote_number: string
    title: string
  }
  line_items?: InvoiceLineItem[]
  payments?: Payment[]
  created_by_user?: {
    full_name: string
  }
}

export interface CustomerInvoiceInsert {
  company_id: string
  lead_id: string
  quote_id?: string | null
  invoice_number: string
  invoice_date: string
  due_date?: string | null
  subtotal: number
  tax_rate?: number
  tax_amount?: number
  total: number
  payment_terms?: string | null
  late_fee_percentage?: number
  notes?: string | null
  internal_notes?: string | null
  created_by?: string | null
}

export interface CustomerInvoiceUpdate {
  invoice_date?: string
  due_date?: string | null
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  status?: InvoiceStatus
  pdf_url?: string | null
  sent_to_email?: string | null
  sent_at?: string | null
  last_viewed_at?: string | null
  payment_terms?: string | null
  late_fee_percentage?: number
  notes?: string | null
  internal_notes?: string | null
}

// =============================================
// INVOICE LINE ITEMS
// =============================================

export interface InvoiceLineItem {
  id: string
  company_id: string
  invoice_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  source_type: 'contract' | 'change_order' | 'additional'
  source_id: string | null
  category: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface InvoiceLineItemInsert {
  company_id: string
  invoice_id: string
  description: string
  quantity?: number
  unit?: string
  unit_price: number
  total?: number
  source_type: 'contract' | 'change_order' | 'additional'
  source_id?: string | null
  category?: string | null
  notes?: string | null
  sort_order?: number
}

export interface InvoiceLineItemUpdate {
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  total?: number
  category?: string | null
  notes?: string | null
  sort_order?: number
}
  quantity?: number
  unit_price?: number
  sort_order?: number
}

// =============================================
// PAYMENTS
// =============================================

export interface Payment {
  id: string
  company_id: string
  lead_id: string
  invoice_id: string | null
  payment_number: string
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  reference_number: string | null
  card_last_four: string | null
  card_brand: string | null
  cleared: boolean
  cleared_date: string | null
  clearing_reference: string | null
  receipt_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PaymentWithRelations extends Payment {
  lead?: {
    full_name: string
    email: string
  }
  invoice?: {
    invoice_number: string
    total: number
  }
  created_by_user?: {
    full_name: string
  }
}

export interface PaymentInsert {
  company_id: string
  lead_id: string
  invoice_id?: string | null
  payment_number: string
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  reference_number?: string | null
  card_last_four?: string | null
  card_brand?: string | null
  cleared?: boolean
  cleared_date?: string | null
  clearing_reference?: string | null
  receipt_url?: string | null
  notes?: string | null
  created_by?: string | null
}

export interface PaymentUpdate {
  payment_date?: string
  amount?: number
  payment_method?: PaymentMethod
  reference_number?: string | null
  card_last_four?: string | null
  card_brand?: string | null
  cleared?: boolean
  cleared_date?: string | null
  clearing_reference?: string | null
  receipt_url?: string | null
  notes?: string | null
}

// =============================================
// COMMISSIONS
// =============================================

export interface Commission {
  id: string
  company_id: string
  lead_id: string
  user_id: string
  commission_type: CommissionType
  base_amount: number
  percentage: number | null
  flat_amount: number | null
  commission_amount: number
  status: CommissionStatus
  approved_at: string | null
  approved_by: string | null
  paid_date: string | null
  payment_reference: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CommissionWithRelations extends Commission {
  lead?: {
    full_name: string
  }
  user?: {
    full_name: string
    email: string
  }
  approved_by_user?: {
    full_name: string
  }
  created_by_user?: {
    full_name: string
  }
}

export interface CommissionInsert {
  company_id: string
  lead_id: string
  user_id: string
  commission_type: CommissionType
  base_amount: number
  percentage?: number | null
  flat_amount?: number | null
  commission_amount: number
  status?: CommissionStatus
  notes?: string | null
  created_by?: string | null
}

export interface CommissionUpdate {
  commission_type?: CommissionType
  base_amount?: number
  percentage?: number | null
  flat_amount?: number | null
  commission_amount?: number
  status?: CommissionStatus
  approved_at?: string | null
  approved_by?: string | null
  paid_date?: string | null
  payment_reference?: string | null
  notes?: string | null
}

// =============================================
// FILTERS
// =============================================

export interface InvoiceFilters {
  status?: InvoiceStatus
  lead_id?: string
  quote_id?: string
  from_date?: string
  to_date?: string
}

export interface PaymentFilters {
  payment_method?: PaymentMethod
  lead_id?: string
  invoice_id?: string
  cleared?: boolean
  from_date?: string
  to_date?: string
}

export interface ChangeOrderFilters {
  status?: ChangeOrderStatus
  lead_id?: string
  quote_id?: string
}

export interface CommissionFilters {
  user_id?: string
  lead_id?: string
  status?: CommissionStatus
  commission_type?: CommissionType
}
