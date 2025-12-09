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
import { 
  RoofMeasurements, 
  calculateMaterialQuantity,
  CalculatedMaterialQuantity 
} from '@/lib/types/materials'
import { 
  GenerateOrderFromTemplateParams, 
  ImportTemplateToOrderResult 
} from '@/lib/types/material-templates'

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
    
    // Debug: Log first order's tax data
    if (data && data.length > 0) {
      console.log('First order tax data from DB:', {
        order_number: data[0].order_number,
        tax_rate: data[0].tax_rate,
        tax_amount: data[0].tax_amount,
        total_with_tax: data[0].total_with_tax,
        total_estimated: data[0].total_estimated
      })
    }
    
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

/**
 * Import template into material order with automatic quantity calculations
 * Uses different measurement types (squares, hip_ridge, perimeter, etc.)
 */
export async function importTemplateToOrder(
  params: GenerateOrderFromTemplateParams & {
    companyId: string
    leadId: string
    order_type?: 'material' | 'work'
    createdBy?: string
    supplier_id?: string | null
    order_date?: string | null
    expected_delivery_date?: string | null
    notes?: string | null
  }
): Promise<ApiResponse<ImportTemplateToOrderResult>> {
  try {
    const supabase = createClient()
    const { template_id, measurements, estimated_costs, companyId, leadId, createdBy, supplier_id, order_date, expected_delivery_date, notes } = params
    const warnings: string[] = []

    // 1. Fetch template with materials
    const { data: templateData, error: templateError } = await supabase
      .from('material_templates')
      .select(`
        *,
        template_materials:template_materials(
          id,
          measurement_type,
          per_unit,
          description,
          sort_order,
          material:materials(
            id,
            name,
            unit,
            current_cost,
            measurement_type,
            default_per_unit,
            default_per_square
          )
        )
      `)
      .eq('id', template_id)
      .eq('company_id', companyId)
      .single()

    if (templateError) throw templateError
    if (!templateData) throw new Error('Template not found')

    // 2. Calculate quantities for each material
    const calculatedItems: CalculatedMaterialQuantity[] = []
    
    for (const tm of templateData.template_materials) {
      if (!tm.material) continue

      // Get measurement settings from the material itself (single source of truth)
      const measurementType = tm.material.measurement_type || 'square'
      const perUnit = tm.material.default_per_unit || tm.material.default_per_square || 1
      
      // Debug: Log per_unit values
      console.log(`${tm.material.name}: measurement_type=${measurementType}, default_per_unit=${tm.material.default_per_unit}, default_per_square=${tm.material.default_per_square}, final perUnit=${perUnit}`)
      
      // Get the actual measurement value based on type
      let measurementValue = 0
      switch (measurementType) {
        case 'square':
          measurementValue = measurements.total_squares || 0
          break
        case 'hip_ridge':
          measurementValue = (measurements.hip_feet || 0) + (measurements.ridge_feet || 0)
          break
        case 'perimeter':
          measurementValue = (measurements.rake_feet || 0) + (measurements.eave_feet || 0)
          break
        case 'ridge':
          measurementValue = measurements.ridge_feet || 0
          break
        case 'valley':
          measurementValue = measurements.valley_feet || 0
          break
        case 'rake':
          measurementValue = measurements.rake_feet || 0
          break
        case 'eave':
          measurementValue = measurements.eave_feet || 0
          break
        case 'each':
          measurementValue = 1
          break
      }
      
      // Calculate quantity based on measurement type
      const calculatedQty = calculateMaterialQuantity(
        measurementType,
        perUnit,
        measurements
      )

      if (calculatedQty === 0) {
        warnings.push(
          `Skipped ${tm.material.name}: No ${measurementType} measurement available`
        )
        continue
      }

      const unitCost = estimated_costs?.[tm.material.id] || tm.material.current_cost || 0
      const total = calculatedQty * unitCost

      // Debug: Log material costs
      console.log(`Material: ${tm.material.name}, current_cost: ${tm.material.current_cost}, unitCost: ${unitCost}`)

      calculatedItems.push({
        material_id: tm.material.id,
        material_name: tm.material.name,
        measurement_type: measurementType,
        measurement_value: measurementValue,
        per_unit: perUnit,
        calculated_quantity: Math.ceil(calculatedQty), // Round up to whole units
        unit: tm.material.unit,
        description: tm.description || tm.material.name,
        estimated_unit_cost: unitCost,
        estimated_total: total
      })
    }

    if (calculatedItems.length === 0) {
      throw new Error('No valid items calculated from template. Check measurements.')
    }

    // 2.5. Fetch and add accessories from measurements
    const { data: measurementData, error: measurementError } = await supabase
      .from('lead_measurements')
      .select(`
        id,
        accessories:measurement_accessories(
          id,
          material_id,
          quantity,
          notes,
          material:materials(
            id,
            name,
            category,
            unit,
            current_cost
          )
        )
      `)
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Add accessories to calculatedItems if they exist
    if (measurementData?.accessories && measurementData.accessories.length > 0) {
      for (const accessory of measurementData.accessories) {
        if (!accessory.material) continue

        const quantity = accessory.quantity || 1
        const unitCost = estimated_costs?.[accessory.material.id] || accessory.material.current_cost || 0
        const total = quantity * unitCost

        calculatedItems.push({
          material_id: accessory.material.id,
          material_name: accessory.material.name,
          measurement_type: 'each',
          measurement_value: quantity,
          per_unit: 1,
          calculated_quantity: quantity,
          unit: accessory.material.unit || 'each',
          description: `${accessory.material.name}${accessory.notes ? ` - ${accessory.notes}` : ''}`,
          estimated_unit_cost: unitCost,
          estimated_total: total
        })
      }

      console.log(`Added ${measurementData.accessories.length} accessories from measurements`)
    }

    // 3. Get company tax rate
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('tax_rate')
      .eq('id', companyId)
      .single()

    if (companyError) throw companyError

    const taxRate = companyData?.tax_rate || 0

    // 4. Create material order
    const isWorkOrder = (params.order_type || 'material') === 'work'
    const { data: order, error: orderError } = await supabase
      .from('material_orders')
      .insert({
        company_id: companyId,
        lead_id: leadId,
        order_type: params.order_type || 'material',
        template_id: template_id,
        template_name: templateData.name,
        status: 'draft',
        created_by: createdBy,
        tax_rate: isWorkOrder ? 0 : taxRate, // Work orders don't have tax
        supplier_id: supplier_id || null,
        order_date: order_date || null,
        expected_delivery_date: expected_delivery_date || null,
        notes: notes || null
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 4. Create order items
    const orderItems = calculatedItems.map(item => ({
      order_id: order.id,
      description: item.description!,
      quantity: item.calculated_quantity || 0,
      unit: item.unit,
      estimated_unit_cost: item.estimated_unit_cost || null,
      notes: `Calculated from ${item.measurement_type}: ${(item.measurement_value || 0).toFixed(2)} × ${item.per_unit} = ${item.calculated_quantity || 0}`
    }))

    const { data: insertedItems, error: itemsError } = await supabase
      .from('material_order_items')
      .insert(orderItems)
      .select()

    if (itemsError) throw itemsError

    // 4. Fetch and add accessories from measurements
    // First, get the measurement ID for this lead
    const { data: leadMeasurement } = await supabase
      .from('lead_measurements')
      .select('id')
      .eq('lead_id', leadId)
      .maybeSingle()

    // Only fetch accessories if we have a measurement record
    if (leadMeasurement?.id) {
      const { data: measurementAccessories, error: accessoriesError } = await supabase
        .from('measurement_accessories')
        .select(`
          id,
          material_id,
          quantity,
          notes,
          materials (
            id,
            name,
            unit,
            current_cost
          )
        `)
        .eq('measurement_id', leadMeasurement.id)

    if (accessoriesError) {
      console.warn('Failed to fetch accessories:', accessoriesError)
      // Don't throw - accessories are optional
    } else if (measurementAccessories && measurementAccessories.length > 0) {
      // Create order items for each accessory
      const accessoryItems = measurementAccessories
        .filter(acc => acc.quantity > 0 && acc.materials)
        .map(acc => ({
          order_id: order.id,
          description: acc.materials!.name,
          quantity: acc.quantity,
          unit: acc.materials!.unit,
          estimated_unit_cost: acc.materials!.current_cost || null,
          notes: acc.notes ? `From measurements: ${acc.notes}` : 'From measurements accessories'
        }))

      if (accessoryItems.length > 0) {
        const { error: accessoryInsertError } = await supabase
          .from('material_order_items')
          .insert(accessoryItems)

        if (accessoryInsertError) {
          console.warn('Failed to insert accessories:', accessoryInsertError)
          // Don't throw - template items are already created
        }
      }
    }
    } // End of if (leadMeasurement?.id)

    // 5. Calculate total from all order items (template + accessories)
    const { data: allOrderItems } = await supabase
      .from('material_order_items')
      .select('quantity, estimated_unit_cost')
      .eq('order_id', order.id)

    const total_estimated = (allOrderItems || []).reduce(
      (sum, item) => sum + (item.quantity * (item.estimated_unit_cost || 0)),
      0
    )

    // 6. Calculate tax and update order with totals
    // Work orders don't include tax, only material orders do
    const isWorkOrder = (params.order_type || 'material') === 'work'
    const tax_amount = isWorkOrder ? 0 : total_estimated * taxRate
    const total_with_tax = total_estimated + tax_amount

    console.log('Updating order with tax:', {
      order_id: order.id,
      order_type: params.order_type || 'material',
      total_estimated,
      taxRate: isWorkOrder ? 0 : taxRate,
      tax_amount,
      total_with_tax
    })

    const { data: updatedOrder, error: updateError } = await supabase
      .from('material_orders')
      .update({ 
        total_estimated,
        tax_amount,
        total_with_tax
      })
      .eq('id', order.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update order with tax:', updateError)
    } else {
      console.log('Order updated with tax:', updatedOrder)
    }

    return {
      data: {
        order_id: order.id,
        items: calculatedItems.map(item => ({
          description: item.description!,
          quantity: item.calculated_quantity,
          unit: item.unit,
          measurement_type: item.measurement_type,
          measurement_value: item.measurement_value,
          estimated_unit_cost: item.estimated_unit_cost || null,
          estimated_total: item.estimated_total || null
        })),
        total_estimated,
        warnings: warnings.length > 0 ? warnings : undefined
      },
      error: null
    }
  } catch (error: any) {
    console.error('Failed to import template to order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Delete a material order (soft delete)
 */
export async function deleteMaterialOrder(
  orderId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('material_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete material order:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update a material order item
 */
export async function updateMaterialOrderItem(
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

    // Recalculate order total
    if (data) {
      await recalculateOrderTotal(data.order_id)
    }

    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update order item:', error)
    return createErrorResponse(error)
  }
}

/**
 * Delete a material order item
 */
export async function deleteMaterialOrderItem(
  itemId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    // Get order_id before deleting
    const { data: item } = await supabase
      .from('material_order_items')
      .select('order_id')
      .eq('id', itemId)
      .single()

    const { error } = await supabase
      .from('material_order_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    // Recalculate order total
    if (item) {
      await recalculateOrderTotal(item.order_id)
    }

    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete order item:', error)
    return createErrorResponse(error)
  }
}

/**
 * Add a new item to an existing order
 */
export async function addMaterialOrderItem(
  orderId: string,
  item: Omit<MaterialOrderItemInsert, 'order_id'>
): Promise<ApiResponse<MaterialOrderItem>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_order_items')
      .insert({
        ...item,
        order_id: orderId
      })
      .select()
      .single()

    if (error) throw error

    // Recalculate order total
    await recalculateOrderTotal(orderId)

    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to add order item:', error)
    return createErrorResponse(error)
  }
}

/**
 * Helper: Recalculate order total from all items including tax
 */
async function recalculateOrderTotal(orderId: string): Promise<void> {
  const supabase = createClient()
  
  // Get order to fetch tax_rate and order_type
  const { data: order } = await supabase
    .from('material_orders')
    .select('tax_rate, order_type')
    .eq('id', orderId)
    .single()

  const taxRate = order?.tax_rate || 0
  const isWorkOrder = order?.order_type === 'work'

  const { data: items } = await supabase
    .from('material_order_items')
    .select('quantity, estimated_unit_cost, actual_unit_cost')
    .eq('order_id', orderId)

  if (!items) return

  const total_estimated = items.reduce(
    (sum, item) => sum + (item.quantity * (item.estimated_unit_cost || 0)),
    0
  )

  const total_actual = items.reduce(
    (sum, item) => sum + (item.quantity * (item.actual_unit_cost || 0)),
    0
  )

  // Work orders should never have tax
  const tax_amount = isWorkOrder ? 0 : total_estimated * taxRate
  const total_with_tax = total_estimated + tax_amount

  await supabase
    .from('material_orders')
    .update({ 
      total_estimated,
      total_actual: total_actual > 0 ? total_actual : 0,
      tax_amount,
      total_with_tax
    })
    .eq('id', orderId)
}
