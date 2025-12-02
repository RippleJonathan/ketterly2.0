import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// NOTE: This route validates the quote via its share_token BEFORE inserting a signature.
// It ignores any client-supplied company_id to prevent tampering.
// Public acceptance must only succeed if the quote exists, has matching share token, and is not already accepted/declined.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      quote_id,
      company_id,
      signer_name,
      signer_email,
      signature_data,
      accepted_terms,
      signer_user_agent,
      share_token, // optional enhancement; if present we validate
    } = body

    // Create an anonymous Supabase client (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Fetch & validate quote via share_token (if provided) to ensure legitimacy
    let derivedCompanyId = company_id
    if (share_token) {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('id, company_id, status, share_token')
        .eq('id', quote_id)
        .eq('share_token', share_token)
        .is('deleted_at', null)
        .single()

      if (quoteError || !quote) {
        return NextResponse.json(
          { error: 'Invalid or expired quote share link' },
          { status: 400 }
        )
      }

      if (quote.status === 'accepted') {
        return NextResponse.json(
          { error: 'Quote already accepted' },
          { status: 400 }
        )
      }
      if (quote.status === 'declined') {
        return NextResponse.json(
          { error: 'Quote has been declined' },
          { status: 400 }
        )
      }

      derivedCompanyId = quote.company_id
    }

    // Insert the signature using derivedCompanyId
    const { data: signature, error } = await supabase
      .from('quote_signatures')
      .insert({
        quote_id,
        company_id: derivedCompanyId,
        signer_name,
        signer_email,
        signature_data,
        accepted_terms,
        signer_user_agent,
        signer_ip_address: request.headers.get('x-forwarded-for') || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ signature_id: signature.id })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
