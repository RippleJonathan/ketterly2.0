import { createClient } from '@/lib/supabase/client'
import { LeadFinancials, FinancialsBreakdown } from '@/lib/types/financials'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'

/**
 * Get complete financial breakdown for a lead
 * Shows profitability from quote stage through completion
 * PRIMARY SOURCE: Invoice total (auto-updated from quotes and change orders)
 */
export async function getLeadFinancials(
  leadId: string
): Promise<ApiResponse<FinancialsBreakdown>> {
  try {
    const supabase = createClient()

    // Get invoice (PRIMARY revenue source - auto-synced from quotes + change orders)
    const { data: invoice } = await supabase
      .from('customer_invoices')
      .select('id, invoice_number, total, subtotal, tax_amount, status, invoice_date, amount_paid, balance_due')
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get invoice line items for breakdown
    const { data: invoiceLineItems } = await supabase
      .from('invoice_line_items')
      .select('id, description, quantity, unit_price, total, quote_line_item_id, change_order_id')
      .eq('invoice_id', invoice?.id || '')
      .order('sort_order', { ascending: true })

    // Get accepted quote (for reference, but contract is source of truth for revenue)
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, total_amount, status, created_at')
      .eq('lead_id', leadId)
      .in('status', ['accepted', 'approved'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get signed contract (contains current_total_with_change_orders = SINGLE SOURCE OF TRUTH)
    const { data: contract } = await supabase
      .from('signed_contracts')
      .select('id, contract_number, original_contract_price, current_contract_price, original_total, current_total_with_change_orders, contract_date')
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('contract_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get approved change orders (for reference in breakdown)
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select('id, change_order_number, amount, status, created_at')
      .eq('lead_id', leadId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Get invoices (billed amount)
    const { data: invoices } = await supabase
      .from('customer_invoices')
      .select('id, invoice_number, total, balance_due, status, invoice_date')
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('invoice_date', { ascending: false })

    // Get payments (collected revenue)
    const { data: payments } = await supabase
      .from('payments')
      .select('id, payment_number, amount, cleared, payment_date')
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false })

    // Get material orders (costs)
    const { data: materialOrders } = await supabase
      .from('material_orders')
      .select(`
        id,
        order_number,
        total_with_tax,
        status,
        order_date,
        order_type,
        is_paid,
        suppliers (
          name
        )
      `)
      .eq('lead_id', leadId)
      .eq('order_type', 'material')
      .is('deleted_at', null)
      .order('order_date', { ascending: false })

    // Get work orders (labor costs)
    const { data: workOrders } = await supabase
      .from('material_orders')
      .select('id, order_number, total_estimated, status, order_date, template_name, notes, is_paid')
      .eq('lead_id', leadId)
      .eq('order_type', 'work')
      .is('deleted_at', null)
      .order('order_date', { ascending: false })

    // Calculate totals
    // PRIMARY SOURCE OF TRUTH: contract.current_total_with_change_orders (auto-updated by trigger)
    // This field = original_contract_price + all approved change orders
    const invoiceTotal = invoice?.total || 0
    const contractOriginalPrice = contract?.original_contract_price || contract?.original_total || 0
    const contractCurrentTotal = contract?.current_total_with_change_orders || 0
    const changeOrdersTotal = changeOrders?.reduce((sum, co) => sum + co.amount, 0) || 0
    
    // Debug logging
    console.log('Financials Debug:', {
      contractOriginalPrice,
      contractCurrentTotal,
      changeOrdersTotal,
      hasContract: !!contract,
      contractFields: contract ? Object.keys(contract) : []
    })
    
    // For display: Use original contract price OR quote if no contract yet
    const quoteTotal = contractOriginalPrice > 0 ? contractOriginalPrice : (quote?.total_amount || 0)
    
    // For revenue calculation: Use source of truth field if available
    // Estimated Revenue Logic (using source of truth):
    // 1. If invoice exists, use that (allows for additional items beyond contract)
    // 2. If contract exists with source of truth field, use that (PREFERRED)
    // 3. Otherwise calculate: contract original + change orders, or quote + change orders
    const estimatedRevenue = invoiceTotal > 0
      ? invoiceTotal
      : contractCurrentTotal > 0
        ? contractCurrentTotal
        : (quoteTotal + changeOrdersTotal)
      
    const invoicedTotal = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0
    const paymentsTotal = payments?.reduce((sum, pay) => sum + pay.amount, 0) || 0
    const paymentsClearedTotal = payments?.reduce((sum, pay) => pay.cleared ? sum + pay.amount : sum, 0) || 0
    const outstandingBalance = invoices?.reduce((sum, inv) => sum + inv.balance_due, 0) || 0

    // Estimated costs (all orders regardless of paid status)
    const materialCosts = materialOrders?.reduce((sum, mo) => sum + mo.total_with_tax, 0) || 0
    const laborCosts = workOrders?.reduce((sum, wo) => sum + wo.total_estimated, 0) || 0
    const totalCosts = materialCosts + laborCosts

    // Actual costs (only paid orders)
    const materialCostsPaid = materialOrders?.reduce((sum, mo) => mo.is_paid ? sum + mo.total_with_tax : sum, 0) || 0
    const laborCostsPaid = workOrders?.reduce((sum, wo) => wo.is_paid ? sum + wo.total_estimated : sum, 0) || 0
    const totalCostsPaid = materialCostsPaid + laborCostsPaid

    // Estimated profitability (based on invoice total vs estimated costs)
    const estimatedProfit = estimatedRevenue - totalCosts
    const estimatedMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0

    // Actual profitability (based on money collected vs costs paid)
    // Uses cleared payments as actual revenue collected
    // Only counts orders marked as paid in actual costs
    const actualRevenue = paymentsClearedTotal
    const actualProfit = actualRevenue - totalCostsPaid
    const actualMargin = actualRevenue > 0 ? (actualProfit / actualRevenue) * 100 : 0

    const summary: LeadFinancials = {
      quote_total: quoteTotal,
      change_orders_total: changeOrdersTotal,
      invoiced_total: invoicedTotal,
      payments_received: paymentsTotal,
      payments_cleared: paymentsClearedTotal,
      outstanding_balance: outstandingBalance,
      
      material_costs: materialCosts,
      labor_costs: laborCosts,
      subcontractor_costs: 0, // Can enhance later
      total_costs: totalCosts,
      total_costs_paid: totalCostsPaid,
      
      estimated_revenue: estimatedRevenue,
      estimated_profit: estimatedProfit,
      estimated_margin: estimatedMargin,
      
      actual_revenue: actualRevenue,
      actual_profit: actualProfit,
      actual_margin: actualMargin,
      
      has_quote: !!quote,
      has_invoice: (invoices?.length || 0) > 0,
      has_payments: (payments?.length || 0) > 0,
      is_profitable: estimatedProfit > 0,
    }

    const breakdown: FinancialsBreakdown = {
      revenue: {
        quote: quote ? {
          id: quote.id,
          total: quote.total_amount,
          status: quote.status,
          created_at: quote.created_at,
        } : null,
        change_orders: changeOrders?.map(co => ({
          id: co.id,
          change_order_number: co.change_order_number,
          amount: co.amount,
          status: co.status,
          created_at: co.created_at,
        })) || [],
        invoices: invoices?.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          total: inv.total,
          balance_due: inv.balance_due,
          status: inv.status,
          invoice_date: inv.invoice_date,
        })) || [],
        payments: payments?.map(pay => ({
          id: pay.id,
          payment_number: pay.payment_number,
          amount: pay.amount,
          cleared: pay.cleared,
          payment_date: pay.payment_date,
        })) || [],
      },
      costs: {
        material_orders: materialOrders?.map(mo => ({
          id: mo.id,
          order_number: mo.order_number,
          supplier_name: mo.suppliers?.name || null,
          total: mo.total_with_tax,
          status: mo.status,
          order_date: mo.order_date,
        })) || [],
        work_orders: workOrders?.map(wo => ({
          id: wo.id,
          order_number: wo.order_number,
          description: wo.template_name || wo.notes || 'Work Order',
          total: wo.total_estimated,
          status: wo.status,
          scheduled_date: wo.order_date,
        })) || [],
        total_material_costs: materialCosts,
        total_labor_costs: laborCosts,
        total_costs: totalCosts,
      },
      summary,
    }

    return { data: breakdown, error: null }
  } catch (error) {
    console.error('Error fetching lead financials:', error)
    return createErrorResponse(error)
  }
}
