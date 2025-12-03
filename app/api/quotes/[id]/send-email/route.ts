import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteToCustomer } from '@/lib/email/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    const body = await request.json()
    const { includePdf = false } = body // New option to include PDF attachment
    
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

    // Get quote with all relations
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        lead:leads(id, full_name, email, phone, address, city, state, zip),
        line_items:quote_line_items(*)
      `)
      .eq('id', quoteId)
      .eq('company_id', userData.company_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: quoteError?.message || 'Quote not found' }, { status: 404 })
    }

    // Check if quote has a share token, if not generate one
    if (!quote.share_token) {
      // Generate token using database function
      const { data: token, error: tokenError } = await supabase.rpc(
        'generate_quote_share_token'
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

      // Update quote with share token using server client
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          share_token: token,
          share_token_created_at: new Date().toISOString(),
          share_link_expires_at: expiresAt.toISOString(),
        })
        .eq('id', quoteId)
        .eq('company_id', userData.company_id)

      if (updateError) {
        console.error('Failed to save share token:', updateError)
        return NextResponse.json(
          { error: 'Failed to save share token' },
          { status: 500 }
        )
      }
      
      quote.share_token = token as string
    }

    // Send email
    const result = await sendQuoteToCustomer(
      quote,
      userData.companies as any,
      {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
      },
      includePdf // Pass the includePdf flag
    )

    if (!result.success) {
      if ('reason' in result && result.reason === 'disabled') {
        return NextResponse.json(
          { error: 'Quote email notifications are disabled. Enable them in Settings > Notifications.' },
          { status: 400 }
        )
      }
      const errMsg = 'error' in result ? (result as any).error?.message || 'Failed to send email' : 'Failed to send email'
      return NextResponse.json(
        { error: errMsg },
        { status: 500 }
      )
    }

    // Update quote status to 'sent' and set sent_at timestamp
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', quoteId)

    // Log activity (best-effort)
    try {
      await supabase
        .from('quote_activities')
        .insert({
          company_id: userData.company_id,
          quote_id: quoteId,
          lead_id: quote.lead_id,
          user_id: userData.id,
          type: 'quote_sent',
        })
    } catch (e) {
      // ignore if table doesn't exist yet
    }

    if (updateError) {
      console.error('Failed to update quote status:', updateError)
      // Don't fail the request since email was sent successfully
    }

    return NextResponse.json({
      success: true,
      shareToken: quote.share_token,
    })
  } catch (error: any) {
    console.error('Send quote email error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
