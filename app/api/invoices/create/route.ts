import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      lead_id,
      quote_id,
      contract_id,
      invoice_date,
      due_date,
      payment_terms,
      notes,
      tax_rate,
      selected_change_order_ids = [],
      additional_items = []
    } = body

    console.log('Creating invoice with data:', {
      lead_id,
      quote_id,
      contract_id,
      selected_change_order_ids,
      additional_items_count: additional_items.length
    })

    // Fetch contract with line items
    const { data: contract, error: contractError } = await supabase
      .from('signed_contracts')
      .select(`
        *,
        line_items:contract_line_items(*)
      `)
      .eq('id', contract_id)
      .eq('company_id', userData.company_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Fetch selected change orders with line items
    let changeOrders: any[] = []
    if (selected_change_order_ids.length > 0) {
      const { data: coData, error: coError } = await supabase
        .from('change_orders')
        .select(`
          *,
          line_items:change_order_line_items(*)
        `)
        .in('id', selected_change_order_ids)
        .eq('company_id', userData.company_id)
        .eq('status', 'approved')

      if (coError) {
        console.error('Error fetching change orders:', coError)
      } else {
        changeOrders = coData || []
      }
    }

    // Generate invoice number
    const { data: invoiceNumber, error: numberError } = await supabase.rpc(
      'generate_invoice_number',
      { p_company_id: userData.company_id }
    )

    if (numberError || !invoiceNumber) {
      return NextResponse.json(
        { error: 'Failed to generate invoice number' },
        { status: 500 }
      )
    }

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('customer_invoices')
      .insert({
        company_id: userData.company_id,
        lead_id,
        quote_id,
        invoice_number: invoiceNumber,
        invoice_date,
        due_date,
        tax_rate: tax_rate || 0,
        payment_terms,
        notes,
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      )
    }

    console.log('Invoice created:', invoice.id)

    // Prepare all line items
    const allLineItems: any[] = []
    let sortOrder = 0

    // 1. Add contract line items
    if (contract.line_items && contract.line_items.length > 0) {
      for (const item of contract.line_items) {
        allLineItems.push({
          invoice_id: invoice.id,
          company_id: userData.company_id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'ea',
          unit_price: item.unit_price,
          total: item.line_total,
          source_type: 'contract',
          source_id: item.id,
          category: item.category,
          sort_order: sortOrder++
        })
      }
    }

    // 2. Add change order line items
    for (const co of changeOrders) {
      if (co.line_items && co.line_items.length > 0) {
        for (const item of co.line_items) {
          allLineItems.push({
            invoice_id: invoice.id,
            company_id: userData.company_id,
            description: `${co.change_order_number}: ${item.description}`,
            quantity: item.quantity,
            unit: item.unit || 'ea',
            unit_price: item.unit_price,
            total: item.total,
            source_type: 'change_order',
            source_id: item.id,
            category: item.category,
            notes: `From change order: ${co.title}`,
            sort_order: sortOrder++
          })
        }
      }
    }

    // 3. Add additional items
    for (const item of additional_items) {
      if (item.description && item.description.trim()) {
        allLineItems.push({
          invoice_id: invoice.id,
          company_id: userData.company_id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'ea',
          unit_price: item.unit_price,
          total: item.total,
          source_type: 'additional',
          source_id: null,
          category: item.category,
          notes: item.notes,
          sort_order: sortOrder++
        })
      }
    }

    console.log(`Inserting ${allLineItems.length} line items`)

    // Insert all line items
    if (allLineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(allLineItems)

      if (lineItemsError) {
        console.error('Error inserting line items:', lineItemsError)
        // Try to clean up the invoice
        await supabase
          .from('customer_invoices')
          .delete()
          .eq('id', invoice.id)
        
        return NextResponse.json(
          { error: `Failed to create invoice line items: ${lineItemsError.message}` },
          { status: 500 }
        )
      }
    }

    // Fetch the complete invoice with line items
    const { data: completeInvoice, error: fetchError } = await supabase
      .from('customer_invoices')
      .select(`
        *,
        line_items:invoice_line_items(*)
      `)
      .eq('id', invoice.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete invoice:', fetchError)
    }

    console.log('Invoice created successfully:', {
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      line_items_count: allLineItems.length,
      total: completeInvoice?.total || 0
    })

    return NextResponse.json({
      success: true,
      invoice: completeInvoice || invoice
    })
  } catch (error: any) {
    console.error('Invoice creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
