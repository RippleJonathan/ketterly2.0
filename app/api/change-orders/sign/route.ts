import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendExecutedChangeOrder } from '@/lib/email/notifications'

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json()
    const { share_token, signer_name, signature_data, signer_title } = body

    if (!share_token || !signer_name || !signature_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS (public endpoint)
    const supabase = createAdminClient()

    // Find change order by share token
    const { data: changeOrder, error: fetchError } = await supabase
      .from('change_orders')
      .select(`
        *,
        quote:quotes!change_orders_quote_id_fkey(
          id,
          lead_id,
          quote_number,
          subtotal,
          discount_amount,
          tax_rate,
          tax_amount,
          total_amount,
          line_items:quote_line_items(*)
        )
      `)
      .eq('share_token', share_token)
      .single()

    if (fetchError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found or link expired' },
        { status: 404 }
      )
    }

    // Check if link is expired
    if (changeOrder.share_link_expires_at) {
      const expiresAt = new Date(changeOrder.share_link_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This signature link has expired' },
          { status: 400 }
        )
      }
    }

    // Check if change order is in the right status
    if (changeOrder.status !== 'sent' && changeOrder.status !== 'pending') {
      return NextResponse.json(
        { error: 'This change order has already been processed' },
        { status: 400 }
      )
    }

    // Determine new status based on signatures
    // If company has already signed, and customer is signing now -> approved
    // If company hasn't signed, and customer signs -> pending_company_signature
    const companyHasSigned = !!changeOrder.company_signature_data
    const newStatus = companyHasSigned ? 'approved' : 'pending_company_signature'

    console.log('Customer signing change order:', {
      changeOrderId: changeOrder.id,
      companyHasSigned,
      newStatus,
      currentStatus: changeOrder.status,
    })

    // Update change order with customer signature
    const { error: updateError } = await supabase
      .from('change_orders')
      .update({
        customer_signature_data: signature_data,
        customer_signer_name: signer_name,
        customer_signed_at: new Date().toISOString(),
        status: newStatus,
        ...(newStatus === 'approved' && {
          approved_at: new Date().toISOString(),
        }),
      })
      .eq('id', changeOrder.id)

    if (updateError) {
      console.error('Failed to save customer signature:', updateError)
      return NextResponse.json(
        { error: 'Failed to save signature' },
        { status: 500 }
      )
    }

    console.log('Customer signature saved successfully')

    // Only create contract revision and send email if BOTH signatures are present
    if (newStatus !== 'approved') {
      return NextResponse.json({
        success: true,
        message: 'Change order signed successfully. Waiting for company signature.',
        status: newStatus,
      })
    }

    // Create a new contract revision if quote exists
    if (changeOrder.quote_id && changeOrder.quote) {
      const quote = Array.isArray(changeOrder.quote) ? changeOrder.quote[0] : changeOrder.quote

      if (!quote) {
        console.error('Quote data not found despite quote_id existing')
        return NextResponse.json({
          success: true,
          message: 'Change order signed successfully. Waiting for company signature.',
          status: newStatus,
        })
      }

      // Calculate new totals
      const newSubtotal = quote.subtotal + changeOrder.amount
      const newTaxAmount = newSubtotal * quote.tax_rate
      const newTotal = newSubtotal - quote.discount_amount + newTaxAmount

      // Create contract revision by calling the create_contract_from_quote function
      const { data: contractId, error: contractError } = await supabase.rpc('create_contract_from_quote', {
        p_quote_id: changeOrder.quote_id,
        p_customer_signature_date: new Date().toISOString(),
        p_customer_signature_data: signature_data,
        p_customer_signed_by: signer_name,
        p_customer_ip_address: null,
        p_company_signature_date: changeOrder.company_signature_date,
        p_company_signature_data: changeOrder.company_signature_data,
        p_company_signed_by: changeOrder.company_signer_name,
      })

      if (contractError) {
        console.error('Failed to create contract revision:', contractError)
        // Don't fail the whole operation if contract creation fails
      }

      // Update the quote totals to reflect the change order
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({
          subtotal: newSubtotal,
          tax_amount: newTaxAmount,
          total_amount: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', changeOrder.quote_id)

      if (quoteUpdateError) {
        console.error('Failed to update quote totals:', quoteUpdateError)
      }
    }

    // Send fully executed change order email to customer
    try {
      // Get company and lead details for email
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', changeOrder.company_id)
        .single()

      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', changeOrder.lead_id)
        .single()

      if (company && lead) {
        await sendExecutedChangeOrder(
          { ...changeOrder, lead },
          company
        )
      }
    } catch (emailError) {
      console.error('Failed to send executed change order email:', emailError)
      // Don't fail the whole operation if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Change order signed successfully',
      status: newStatus,
    })
  } catch (error: any) {
    console.error('Change order signature error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
