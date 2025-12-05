import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  MaterialOrder,
  MaterialOrderInsert,
  MaterialOrderUpdate,
  MaterialOrderItem,
  MaterialOrderItemInsert,
  MaterialOrderItemUpdate,
  OrderInvoice,
  OrderInvoiceInsert,
  OrderInvoiceUpdate,
  MaterialOrderFilters,
  ProfitMarginData
} from '@/lib/types/material-orders'

/**
 * Get all material orders for a company or lead
 */
export async function getMaterialOrders(
  companyId: string,
  filters?: MaterialOrderFilters
): Promise<ApiResponse<MaterialOrder[]>> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('material_orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:material_order_items(*),
        invoices:order_invoices(*)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.search) {
      query = query.ilike('order_number', `%${filters.search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], error: null, count: count || undefined }
  } catch (error: any) {
    console.error('Failed to fetch material orders:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get a single material order by ID with all relations
 */
export async function getMaterialOrder(
  companyId: string,
  orderId: string
): Promise<ApiResponse<MaterialOrder>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:material_order_items(*),
        invoices:order_invoices(*)
      `)
      .eq('id', orderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch material order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a new material order
 */
export async function createMaterialOrder(
  companyId: string,
  order: MaterialOrderInsert
): Promise<ApiResponse<MaterialOrder>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_orders')
      .insert({ ...order, company_id: companyId })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to create material order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create material order from template with auto-calculated quantities
 */
export async function createFromTemplate(
  companyId: string,
  leadId: string,
  templateId: string,
  templateName: string,
  squares: number,
  items: MaterialOrderItemInsert[]
): Promise<ApiResponse<MaterialOrder>> {
  try {
    const supabase = createClient()
    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('material_orders')
      .insert({
        company_id: companyId,
        lead_id: leadId,
        template_id: templateId,
        template_name: templateName,
        status: 'draft'
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Add line items
    const itemsToInsert = items.map(item => ({
      ...item,
      order_id: order.id
    }))

    const { error: itemsError } = await supabase
      .from('material_order_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // Fetch complete order with items
    return getMaterialOrder(companyId, order.id)
  } catch (error: any) {
    console.error('Failed to create order from template:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update a material order
 */
export async function updateMaterialOrder(
  companyId: string,
  orderId: string,
  updates: MaterialOrderUpdate
): Promise<ApiResponse<MaterialOrder>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_orders')
      .update(updates)
      .eq('id', orderId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update material order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update order status (with optional delivery date for 'delivered' status)
 */
export async function updateOrderStatus(
  companyId: string,
  orderId: string,
  status: MaterialOrder['status'],
  actualDeliveryDate?: string
): Promise<ApiResponse<MaterialOrder>> {
  try {
    const supabase = createClient()
    const updates: MaterialOrderUpdate = { status }
    
    if (status === 'delivered' && actualDeliveryDate) {
      updates.actual_delivery_date = actualDeliveryDate
    }

    return updateMaterialOrder(companyId, orderId, updates)
  } catch (error: any) {
    console.error('Failed to update order status:', error)
    return createErrorResponse(error)
  }
}

/**
 * Add line item to order
 */
export async function addOrderItem(
  item: MaterialOrderItemInsert
): Promise<ApiResponse<MaterialOrderItem>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_order_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to add order item:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update line item
 */
export async function updateOrderItem(
  itemId: string,
  updates: MaterialOrderItemUpdate
): Promise<ApiResponse<MaterialOrderItem>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_order_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update order item:', error)
    return createErrorResponse(error)
  }
}

/**
 * Delete line item
 */
export async function deleteOrderItem(
  itemId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('material_order_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete order item:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update actual costs for multiple items (when invoice arrives)
 */
export async function updateActualCosts(
  companyId: string,
  orderId: string,
  itemCosts: { itemId: string; actualUnitCost: number }[]
): Promise<ApiResponse<MaterialOrder>> {
  try {
    const supabase = createClient()
    // Update each item's actual cost
    for (const { itemId, actualUnitCost } of itemCosts) {
      const { error } = await supabase
        .from('material_order_items')
        .update({ actual_unit_cost: actualUnitCost })
        .eq('id', itemId)
        .eq('order_id', orderId)

      if (error) throw error
    }

    // Fetch updated order (triggers will recalculate totals)
    return getMaterialOrder(companyId, orderId)
  } catch (error: any) {
    console.error('Failed to update actual costs:', error)
    return createErrorResponse(error)
  }
}

/**
 * Upload and attach invoice to order
 */
export async function uploadInvoice(
  companyId: string,
  orderId: string,
  invoice: OrderInvoiceInsert
): Promise<ApiResponse<OrderInvoice>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('order_invoices')
      .insert({ ...invoice, company_id: companyId, order_id: orderId })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to upload invoice:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update invoice
 */
export async function updateInvoice(
  companyId: string,
  invoiceId: string,
  updates: OrderInvoiceUpdate
): Promise<ApiResponse<OrderInvoice>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('order_invoices')
      .update(updates)
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update invoice:', error)
    return createErrorResponse(error)
  }
}

/**
 * Delete invoice
 */
export async function deleteInvoice(
  companyId: string,
  invoiceId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('order_invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('company_id', companyId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete invoice:', error)
    return createErrorResponse(error)
  }
}

/**
 * Calculate profit margin for a lead based on orders
 */
export async function calculateProfitMargin(
  companyId: string,
  leadId: string,
  quotedAmount: number
): Promise<ProfitMarginData> {
  // Fetch all material orders for this lead
  const { data: orders } = await getMaterialOrders(companyId, { lead_id: leadId })

  const total_estimated = orders?.reduce((sum, order) => sum + (order.total_estimated || 0), 0) || 0
  const total_actual = orders?.reduce((sum, order) => sum + (order.total_actual || 0), 0) || 0

  const estimated_profit = quotedAmount - total_estimated
  const actual_profit = quotedAmount - total_actual

  const estimated_margin_percent = quotedAmount > 0 ? (estimated_profit / quotedAmount) * 100 : 0
  const actual_margin_percent = quotedAmount > 0 ? (actual_profit / quotedAmount) * 100 : 0

  const variance = total_actual - total_estimated
  const variance_percent = total_estimated > 0 ? (variance / total_estimated) * 100 : 0

  return {
    quoted_amount: quotedAmount,
    total_estimated,
    total_actual,
    estimated_profit,
    actual_profit,
    estimated_margin_percent,
    actual_margin_percent,
    variance,
    variance_percent
  }
}
