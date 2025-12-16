import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendChangeOrderToCustomer } from '@/lib/email/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: changeOrderId } = await params
    
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details with company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, phone, company_id, companies(*)')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: userError?.message || 'User not found' }, { status: 404 })
    }

    // Get change order with lead and line items
    const { data: changeOrder, error: changeOrderError } = await supabase
      .from('change_orders')
      .select(`
        *,
        lead:leads(id, full_name, email, phone, address, city, state, zip),
        line_items:change_order_line_items(*)
      `)
      .eq('id', changeOrderId)
      .eq('company_id', userData.company_id)
      .single()

    if (changeOrderError || !changeOrder) {
      return NextResponse.json({ error: changeOrderError?.message || 'Change order not found' }, { status: 404 })
    }

    // Check if change order has a share token, if not generate one
    if (!changeOrder.share_token) {
      // Generate token using database function
      const { data: token, error: tokenError } = await supabase.rpc(
        'generate_change_order_share_token'
      )

      if (tokenError || !token) {
        return NextResponse.json(
          { error: 'Failed to generate share token' },
          { status: 500 }
        )
      }

      // Calculate expiration date (30 days)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Update change order with share token
      const { error: updateError } = await supabase
        .from('change_orders')
        .update({
          share_token: token,
          share_token_created_at: new Date().toISOString(),
          share_link_expires_at: expiresAt.toISOString(),
        })
        .eq('id', changeOrderId)
        .eq('company_id', userData.company_id)

      if (updateError) {
        console.error('Failed to save share token:', updateError)
        return NextResponse.json(
          { error: 'Failed to save share token' },
          { status: 500 }
        )
      }
      
      changeOrder.share_token = token as string
    }

    // Send email
    const result = await sendChangeOrderToCustomer(
      changeOrder,
      userData.companies as any,
      {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
      }
    )

    if (!result.success) {
      if ('reason' in result && result.reason === 'disabled') {
        return NextResponse.json(
          { error: 'Change order email notifications are disabled. Enable them in Settings > Notifications.' },
          { status: 400 }
        )
      }
      const errMsg = 'error' in result ? (result as any).error?.message || 'Failed to send email' : 'Failed to send email'
      return NextResponse.json(
        { error: errMsg },
        { status: 500 }
      )
    }

    // Update change order status to 'sent' and set sent_at timestamp
    const { error: updateError } = await supabase
      .from('change_orders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', changeOrderId)

    if (updateError) {
      console.error('Failed to update change order status:', updateError)
      // Don't fail the request since email was sent successfully
    }

    return NextResponse.json({
      success: true,
      shareToken: changeOrder.share_token,
    })
  } catch (error: any) {
    console.error('Send change order email error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
