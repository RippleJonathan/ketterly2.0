import { Database } from './database'

// Table type helpers
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Specific entity types
export type Company = Tables<'companies'>
export type User = Tables<'users'>
export type Lead = Tables<'leads'>
export type Customer = Tables<'customers'>
export type Quote = Tables<'quotes'>
export type QuoteLineItem = Tables<'quote_line_items'>
export type Project = Tables<'projects'>
export type ProjectTask = Tables<'project_tasks'>
export type Activity = Tables<'activities'>

// Insert types
export type CompanyInsert = Inserts<'companies'>
export type UserInsert = Inserts<'users'>
export type LeadInsert = Inserts<'leads'>
export type CustomerInsert = Inserts<'customers'>
export type QuoteInsert = Inserts<'quotes'>
export type QuoteLineItemInsert = Inserts<'quote_line_items'>
export type ProjectInsert = Inserts<'projects'>
export type ProjectTaskInsert = Inserts<'project_tasks'>
export type ActivityInsert = Inserts<'activities'>

// Update types
export type CompanyUpdate = Updates<'companies'>
export type UserUpdate = Updates<'users'>
export type LeadUpdate = Updates<'leads'>
export type CustomerUpdate = Updates<'customers'>
export type QuoteUpdate = Updates<'quotes'>
export type QuoteLineItemUpdate = Updates<'quote_line_items'>
export type ProjectUpdate = Updates<'projects'>
export type ProjectTaskUpdate = Updates<'project_tasks'>
export type ActivityUpdate = Updates<'activities'>

// Extended types with relations
export type LeadWithUser = Lead & {
  assigned_user?: User | null
  created_user?: User | null
}

export type QuoteWithRelations = Quote & {
  line_items?: QuoteLineItem[]
  customer?: Customer | null
  lead?: Lead | null
}

export type ProjectWithRelations = Project & {
  customer: Customer
  tasks?: ProjectTask[]
  crew_lead?: User | null
}

// Filter types
export type LeadFilters = {
  status?: Lead['status'] | Lead['status'][]
  source?: Lead['source'] | Lead['source'][]
  priority?: Lead['priority'] | Lead['priority'][]
  service_type?: Lead['service_type'] | Lead['service_type'][]
  assigned_to?: string | null
  location_id?: string | string[] // Support single or multiple locations
  created_from?: string // ISO date string
  created_to?: string // ISO date string
  search?: string
}

export type QuoteFilters = {
  status?: Quote['status'] | Quote['status'][]
  customer_id?: string
  lead_id?: string
  search?: string
}

export type ProjectFilters = {
  status?: Project['status'] | Project['status'][]
  priority?: Project['priority'] | Project['priority'][]
  assigned_crew_lead?: string
  search?: string
}

// Re-export commission types
export * from './commissions'
