import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendExecutedChangeOrder } from '@/lib/email/notifications'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: changeOrderId } = await params
    const body = await request.json()
    const { signer_name, signer_title, signature_data } = body

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get change order details
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
      .eq('id', changeOrderId)
      .single()

    if (fetchError || !changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    if (changeOrder.status !== 'pending' && changeOrder.status !== 'sent' && changeOrder.status !== 'pending_company_signature') {
      console.error('Invalid change order status:', {
        changeOrderId,
        currentStatus: changeOrder.status,
        allowedStatuses: ['pending', 'sent', 'pending_company_signature']
      })
      return NextResponse.json(
        { error: `Change order has already been processed (status: ${changeOrder.status})` },
        { status: 400 }
      )
    }

    // Determine new status based on signatures
    // If customer has already signed, and company is signing now -> approved
    // If customer hasn't signed, and company signs -> pending_customer_signature (need customer)
    const customerHasSigned = !!changeOrder.customer_signature_data
    const newStatus = customerHasSigned ? 'approved' : 'sent'

    console.log('Company signing change order:', {
      changeOrderId,
      customerHasSigned,
      newStatus,
      currentStatus: changeOrder.status,
    })

    // Update the change order with company signature
    const { error: updateError } = await supabase
      .from('change_orders')
      .update({
        status: newStatus,
        ...(newStatus === 'approved' && {
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        }),
        company_signature_date: new Date().toISOString(),
        company_signature_data: signature_data,
        company_signer_name: signer_name,
        company_signer_title: signer_title || null,
      })
      .eq('id', changeOrderId)

    if (updateError) {
      console.error('Failed to save company signature:', updateError)
      throw updateError
    }

    console.log('Company signature saved successfully')

    // Only create contract revision and send email if BOTH signatures are present
    if (newStatus !== 'approved') {
      return NextResponse.json({
        success: true,
        message: 'Company signature saved. Waiting for customer signature.',
        status: newStatus,
      })
    }

    console.log('Both signatures present - change order approved')

    return NextResponse.json({
      success: true,
      message: 'Change order approved successfully',
    })
  } catch (error: any) {
    console.error('Error approving change order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve change order' },
      { status: 500 }
    )
  }
}
