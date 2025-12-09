import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'

/**
 * Recalculate tax for all orders in a company
 * Useful when company tax rate changes
 */
export async function recalculateTaxForAllOrders(
  companyId: string
): Promise<ApiResponse<{ updated: number }>> {
  try {
    const supabase = createClient()
    
    // Get company tax rate
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('tax_rate')
      .eq('id', companyId)
      .single()

    if (companyError) throw companyError
    
    const taxRate = company?.tax_rate || 0

    // Get all orders for this company
    const { data: orders, error: ordersError } = await supabase
      .from('material_orders')
      .select('id, total_estimated, order_type')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (ordersError) throw ordersError
    if (!orders || orders.length === 0) {
      return { data: { updated: 0 }, error: null }
    }

    // Update each order
    let updated = 0
    for (const order of orders) {
      const isWorkOrder = order.order_type === 'work'
      
      // Work orders should never have tax
      const tax_amount = isWorkOrder ? 0 : order.total_estimated * taxRate
      const total_with_tax = order.total_estimated + tax_amount

      const { error: updateError } = await supabase
        .from('material_orders')
        .update({
          tax_rate: isWorkOrder ? 0 : taxRate,
          tax_amount,
          total_with_tax
        })
        .eq('id', order.id)

      if (!updateError) {
        updated++
      }
    }

    return { data: { updated }, error: null }
  } catch (error: any) {
    console.error('Failed to recalculate taxes:', error)
    return createErrorResponse(error)
  }
}
