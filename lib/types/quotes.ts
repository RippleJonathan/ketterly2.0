// Quote types for Ketterly CRM
import { Database } from './database'

// Database table types
export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update']

export type QuoteLineItem = Database['public']['Tables']['quote_line_items']['Row']
export type QuoteLineItemInsert = Database['public']['Tables']['quote_line_items']['Insert']
export type QuoteLineItemUpdate = Database['public']['Tables']['quote_line_items']['Update']

export type QuoteSignature = Database['public']['Tables']['quote_signatures']['Row']
export type QuoteSignatureInsert = Database['public']['Tables']['quote_signatures']['Insert']

// Quote status enum
export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

// Line item category enum
export enum LineItemCategory {
  LABOR = 'Labor',
  MATERIALS = 'Materials',
  PERMITS = 'Permits',
  EQUIPMENT = 'Equipment',
  OTHER = 'Other',
}

// Quote with relations
export interface QuoteWithRelations extends Quote {
  line_items?: QuoteLineItem[]
  lead?: {
    id: string
    full_name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zip: string
  }
  signatures?: QuoteSignature[]  // Changed from singular to array for dual signatures
  company?: {
    id: string
    name: string
    contract_terms: string | null
  }
  created_by_user?: {
    id: string
    full_name: string
    email: string
  }
}

// Quote totals calculation result
export interface QuoteTotals {
  subtotal: number
  tax: number
  discount: number
  total: number
}

// Line item form data
export interface LineItemFormData {
  category: LineItemCategory
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  cost_per_unit?: number
  supplier?: string
  notes?: string
}

// Quote form data
export interface QuoteFormData {
  option_label?: string
  tax_rate: number
  discount_amount: number
  payment_terms: string
  notes?: string
  valid_until: Date
  line_items: LineItemFormData[]
}

// Quote filters
export interface QuoteFilters {
  status?: QuoteStatus | QuoteStatus[]
  leadId?: string
  search?: string
  dateFrom?: Date
  dateTo?: Date
}

// Quote list item (for table display)
export interface QuoteListItem {
  id: string
  quote_number: string
  status: QuoteStatus
  total_amount: number
  valid_until: string
  created_at: string
  lead_name: string
  lead_email: string
  option_label?: string
}
