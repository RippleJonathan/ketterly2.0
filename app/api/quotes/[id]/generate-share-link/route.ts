import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    console.log('Generate share link called for quote:', quoteId)
    
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details with company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, share_token, company_id')
      .eq('id', quoteId)
      .eq('company_id', userData.company_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // If quote already has a share token, return it
    if (quote.share_token) {
      return NextResponse.json({
        success: true,
        shareToken: quote.share_token,
      })
    }

    // Generate new share token
    let token: string
    try {
      const { data: rpcToken, error: tokenError } = await supabase.rpc(
        'generate_quote_share_token'
      )

      if (tokenError || !rpcToken) {
        console.error('RPC function error:', tokenError)
        // Fallback: generate token manually
        token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      } else {
        token = rpcToken as string
      }
    } catch (rpcError) {
      console.error('RPC call failed:', rpcError)
      // Fallback: generate token manually
      token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }

    // Calculate expiration date (30 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Update quote with share token
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
        { error: `Failed to save share token: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('Successfully generated share token for quote:', quoteId, 'token:', token)

    return NextResponse.json({
      success: true,
      shareToken: token,
    })
  } catch (error: any) {
    console.error('Generate share link error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
