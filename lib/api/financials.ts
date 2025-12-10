import { createClient } from '@/lib/supabase/client'
import { LeadFinancials, FinancialsBreakdown } from '@/lib/types/financials'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'

/**
 * Get complete financial breakdown for a lead
 * Shows profitability from quote stage through completion
 */
export async function getLeadFinancials(
  leadId: string
): Promise<ApiResponse<FinancialsBreakdown>> {
  try {
    const supabase = createClient()

    // Get quote (revenue starting point)
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, total_amount, status, created_at')
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get approved change orders (additional revenue)
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
    const quoteTotal = quote?.total_amount || 0
    const changeOrdersTotal = changeOrders?.reduce((sum, co) => sum + co.amount, 0) || 0
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

    // Estimated profitability (based on quote + change orders vs estimated costs)
    const estimatedRevenue = quoteTotal + changeOrdersTotal
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
