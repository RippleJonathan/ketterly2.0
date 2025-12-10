// Financials & Profitability Types

export interface LeadFinancials {
  // Revenue
  quote_total: number
  change_orders_total: number
  invoiced_total: number
  payments_received: number
  payments_cleared: number
  outstanding_balance: number
  
  // Costs
  material_costs: number
  labor_costs: number
  subcontractor_costs: number
  total_costs: number
  total_costs_paid: number // Only orders marked as paid
  
  // Profitability
  estimated_revenue: number // quote + approved change orders
  estimated_profit: number
  estimated_margin: number // percentage
  
  actual_revenue: number // invoiced amount
  actual_profit: number
  actual_margin: number
  
  // Status
  has_quote: boolean
  has_invoice: boolean
  has_payments: boolean
  is_profitable: boolean
}

export interface CostBreakdown {
  material_orders: Array<{
    id: string
    order_number: string
    supplier_name: string | null
    total: number
    status: string
    order_date: string
  }>
  work_orders: Array<{
    id: string
    order_number: string
    description: string
    total: number
    status: string
    scheduled_date: string | null
  }>
  total_material_costs: number
  total_labor_costs: number
  total_costs: number
}

export interface RevenueBreakdown {
  quote: {
    id: string
    total: number
    status: string
    created_at: string
  } | null
  change_orders: Array<{
    id: string
    change_order_number: string
    amount: number
    status: string
    created_at: string
  }>
  invoices: Array<{
    id: string
    invoice_number: string
    total: number
    balance_due: number
    status: string
    invoice_date: string
  }>
  payments: Array<{
    id: string
    payment_number: string
    amount: number
    cleared: boolean
    payment_date: string
  }>
}

export interface FinancialsBreakdown {
  revenue: RevenueBreakdown
  costs: CostBreakdown
  summary: LeadFinancials
}
