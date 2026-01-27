import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  WorkOrder,
  WorkOrderInsert,
  WorkOrderUpdate,
  WorkOrderLineItem,
  WorkOrderLineItemInsert,
  WorkOrderFilters,
} from '@/lib/types/work-orders'

/**
 * Get all work orders for a company or lead
 */
export async function getWorkOrders(
  companyId: string,
  filters?: WorkOrderFilters
): Promise<ApiResponse<WorkOrder[]>> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('work_orders')
      .select(`
        *,
        subcontractor:suppliers(*),
        line_items:work_order_line_items(*),
        leads(location_id, locations(id, name, address, city, state, zip, phone, email))
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }

    if (filters?.subcontractor_id) {
      query = query.eq('subcontractor_id', filters.subcontractor_id)
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.is_paid !== undefined) {
      query = query.eq('is_paid', filters.is_paid)
    }

    if (filters?.search) {
      query = query.or(`work_order_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error
    
    return { data: data || [], error: null, count: count || undefined }
  } catch (error: any) {
    console.error('Failed to fetch work orders:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get a single work order by ID
 */
export async function getWorkOrder(
  companyId: string,
  workOrderId: string
): Promise<ApiResponse<WorkOrder>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        subcontractor:suppliers(*),
        line_items:work_order_line_items(*),
        leads(location_id, locations(id, name, address, city, state, zip, phone, email))
      `)
      .eq('id', workOrderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch work order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a new work order
 */
export async function createWorkOrder(
  companyId: string,
  order: WorkOrderInsert
): Promise<ApiResponse<WorkOrder>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_orders')
      .insert({ ...order, company_id: companyId })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to create work order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update a work order
 */
export async function updateWorkOrder(
  companyId: string,
  workOrderId: string,
  updates: WorkOrderUpdate
): Promise<ApiResponse<WorkOrder>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', workOrderId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update work order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Delete a work order (soft delete)
 */
export async function deleteWorkOrder(
  companyId: string,
  workOrderId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    // Soft delete the work order
    const { error: orderError } = await supabase
      .from('work_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', workOrderId)
      .eq('company_id', companyId)

    if (orderError) throw orderError
    
    // Also delete any associated calendar events
    const { error: eventError } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('labor_order_id', workOrderId)
      .is('deleted_at', null)
    
    if (eventError) {
      console.warn('Failed to delete associated calendar events:', eventError)
      // Don't fail the whole operation if calendar deletion fails
    }

    return { data: null, error: null }
  } catch (error: any) {
    console.error('Failed to delete work order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Add line items to a work order
 */
export async function addWorkOrderLineItems(
  companyId: string,
  workOrderId: string,
  items: WorkOrderLineItemInsert[]
): Promise<ApiResponse<WorkOrderLineItem[]>> {
  try {
    const supabase = createClient()
    
    // Verify work order belongs to company
    const { data: workOrder, error: verifyError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .eq('company_id', companyId)
      .single()

    if (verifyError || !workOrder) {
      throw new Error('Work order not found or access denied')
    }

    const itemsToInsert = items.map(item => ({
      ...item,
      work_order_id: workOrderId
    }))

    const { data, error } = await supabase
      .from('work_order_line_items')
      .insert(itemsToInsert)
      .select()

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Failed to add line items:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update work order line items (replace all)
 */
export async function updateWorkOrderLineItems(
  companyId: string,
  workOrderId: string,
  items: WorkOrderLineItemInsert[]
): Promise<ApiResponse<WorkOrderLineItem[]>> {
  try {
    const supabase = createClient()
    
    // Verify work order belongs to company
    const { data: workOrder, error: verifyError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', workOrderId)
      .eq('company_id', companyId)
      .single()

    if (verifyError || !workOrder) {
      throw new Error('Work order not found or access denied')
    }

    // Delete existing line items
    const { error: deleteError } = await supabase
      .from('work_order_line_items')
      .delete()
      .eq('work_order_id', workOrderId)

    if (deleteError) throw deleteError

    // Insert new line items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        work_order_id: workOrderId
      }))

      const { data, error } = await supabase
        .from('work_order_line_items')
        .insert(itemsToInsert)
        .select()

      if (error) throw error
      return { data: data || [], error: null }
    }

    return { data: [], error: null }
  } catch (error: any) {
    console.error('Failed to update line items:', error)
    return createErrorResponse(error)
  }
}

/**
 * Send work order email (placeholder for future implementation)
 */
export async function sendWorkOrderEmail(
  companyId: string,
  workOrderId: string
): Promise<ApiResponse<void>> {
  try {
    // TODO: Implement email sending via API route
    console.log('Send work order email:', workOrderId)
    return { data: null, error: null }
  } catch (error: any) {
    console.error('Failed to send work order email:', error)
    return createErrorResponse(error)
  }
}
