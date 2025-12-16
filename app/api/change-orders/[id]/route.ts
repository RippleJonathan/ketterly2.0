// API routes for individual change order operations
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/change-orders/[id] - Get a single change order with line items
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get change order with line items
    const { data: changeOrder, error: fetchError } = await supabase
      .from('change_orders')
      .select(`
        *,
        line_items:change_order_line_items(*)
      `)
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !changeOrder) {
      console.error('Error fetching change order:', fetchError)
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    // Filter out soft-deleted line items on the client side
    if (changeOrder.line_items) {
      changeOrder.line_items = changeOrder.line_items.filter((item: any) => !item.deleted_at)
    }

    console.log('Fetched change order with line items:', {
      id: changeOrder.id,
      lineItemsCount: changeOrder.line_items?.length || 0,
      lineItems: changeOrder.line_items
    })

    return NextResponse.json(changeOrder)
  } catch (error) {
    console.error('Error in GET /api/change-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/change-orders/[id] - Update a change order
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if change order exists and belongs to user's company
    const { data: changeOrder, error: fetchError } = await supabase
      .from('change_orders')
      .select('id, company_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    if (changeOrder.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow editing draft change orders
    if (changeOrder.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only edit draft change orders' },
        { status: 400 }
      )
    }

    // Update change order
    const { title, description, line_items } = body

    // Update the change order itself
    const { error: updateError } = await supabase
      .from('change_orders')
      .update({
        title,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating change order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update change order' },
        { status: 500 }
      )
    }

    // Delete existing line items
    const { error: deleteLineItemsError } = await supabase
      .from('change_order_line_items')
      .delete()
      .eq('change_order_id', id)

    if (deleteLineItemsError) {
      console.error('Error deleting line items:', deleteLineItemsError)
      return NextResponse.json(
        { error: 'Failed to update line items' },
        { status: 500 }
      )
    }

    // Insert new line items
    if (line_items && line_items.length > 0) {
      const lineItemsToInsert = line_items.map((item: any, index: number) => ({
        change_order_id: id,
        company_id: userData.company_id,  // REQUIRED FIELD
        category: item.category || 'labor',
        description: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'ea',
        unit_price: item.unit_price || 0,
        total: item.line_total || (item.quantity * item.unit_price) || 0,
        material_id: item.material_id || null,
        sort_order: index
      }))

      console.log('Inserting line items:', JSON.stringify(lineItemsToInsert, null, 2))

      const { error: insertError } = await supabase
        .from('change_order_line_items')
        .insert(lineItemsToInsert)

      if (insertError) {
        console.error('Error inserting line items:', insertError)
        return NextResponse.json(
          { error: `Failed to insert line items: ${insertError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/change-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/change-orders/[id] - Soft delete a change order
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if change order exists and belongs to user's company
    const { data: changeOrder, error: fetchError } = await supabase
      .from('change_orders')
      .select(`
        id,
        company_id,
        status,
        deleted_at
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !changeOrder) {
      console.error('Error fetching change order for delete:', fetchError)
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    if (changeOrder.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow deleting draft or sent change orders (not approved ones)
    if (changeOrder.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete approved change orders' },
        { status: 400 }
      )
    }

    // Soft delete the change order
    const { error: deleteError } = await supabase
      .from('change_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting change order:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete change order' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/change-orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
