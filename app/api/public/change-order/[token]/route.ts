import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Use admin client to bypass RLS (public endpoint)
    const supabase = createAdminClient()

    // Find change order by share token
    const { data: changeOrder, error: fetchError } = await supabase
      .from('change_orders')
      .select(`
        *,
        lead:leads(id, full_name, email, phone, address, city, state, zip),
        company:companies(id, name, logo_url, primary_color, contact_email, contact_phone, address, city, state, zip),
        line_items:change_order_line_items(*)
      `)
      .eq('share_token', token)
      .single()

    if (fetchError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found or link has expired' },
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

    // Check if already signed by customer
    if (changeOrder.customer_signed_at) {
      return NextResponse.json(
        { error: 'This change order has already been signed' },
        { status: 400 }
      )
    }

    // Return change order with line items
    return NextResponse.json(changeOrder)
  } catch (error: any) {
    console.error('Public change order fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
