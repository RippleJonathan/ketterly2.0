import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    console.log('Looking for quote with token:', token)
    const supabase = createAdminClient()

    // Fetch quote with all relations using server client (bypasses browser RLS issues)
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(*),
        lead:leads(id, full_name, email, phone, address, city, state, zip),
        signature:quote_signatures!quote_signatures_quote_id_fkey(*),
        company:companies(id, name, contract_terms, logo_url, primary_color, replacement_warranty_years, repair_warranty_years, contact_email, contact_phone, address, city, state, zip)
      `)
      .eq('share_token', token)
      .is('deleted_at', null)
      .single()

    console.log('Query result - error:', error, 'quote found:', !!quote)

    if (error || !quote) {
      console.error('Failed to fetch quote:', error)
      return NextResponse.json(
        { error: 'Quote not found or link expired' },
        { status: 404 }
      )
    }

    const quoteData = quote as any

    // Check if link is expired
    if (quoteData.share_link_expires_at && new Date(quoteData.share_link_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This quote link has expired' },
        { status: 410 }
      )
    }

    // Update view status if not already viewed
    if (quoteData.status === 'sent') {
      await (supabase as any)
        .from('quotes')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', quoteData.id)
      
      quoteData.status = 'viewed'
      quoteData.viewed_at = new Date().toISOString()
    }

    return NextResponse.json({ data: quoteData })
  } catch (error: any) {
    console.error('Get public quote error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
