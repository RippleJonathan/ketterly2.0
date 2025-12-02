import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/quotes/sign-pdf
 * 
 * Accepts a quote signature, generates a signed PDF, saves it to storage,
 * and updates the quote status to 'accepted' (which triggers lead status update via DB trigger).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      quote_id,
      share_token,
      signer_name,
      signer_email,
      signature_data,
      accepted_terms,
      signer_user_agent,
      signer_type = 'customer', // Default to customer
      signer_title, // Optional, for company reps
    } = body

    // Validate required fields
    if (!quote_id || !share_token || !signer_name || !signer_email || !signature_data || !accepted_terms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client with SERVICE ROLE key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 1. Fetch and validate the quote via share_token (no embedded relationships)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .eq('share_token', share_token)
      .is('deleted_at', null)
      .single()

    if (quoteError || !quote) {
      console.error('Quote fetch error:', quoteError)
      return NextResponse.json(
        { error: 'Invalid or expired quote share link' },
        { status: 400 }
      )
    }

    // 2. Check quote status
    console.log('Quote status check:', {
      quoteId: quote.id,
      currentStatus: quote.status,
      leadId: quote.lead_id
    })
    
    if (quote.status === 'accepted') {
      console.log('Quote already accepted, rejecting signature')
      return NextResponse.json(
        { error: 'Quote already accepted' },
        { status: 400 }
      )
    }
    if (quote.status === 'declined') {
      console.log('Quote declined, rejecting signature')
      return NextResponse.json(
        { error: 'Quote has been declined' },
        { status: 400 }
      )
    }

    console.log('Quote status valid, proceeding with signature insertion')

    // 3. Insert signature record
    console.log('Attempting signature insert for quote:', quote_id)
    const { data: signature, error: signatureError } = await supabase
      .from('quote_signatures')
      .insert({
        quote_id,
        company_id: quote.company_id,
        signer_name,
        signer_email,
        signature_data,
        accepted_terms,
        signer_user_agent,
        signer_ip_address: request.headers.get('x-forwarded-for') || null,
        signer_type,
        signer_title,
      })
      .select('id')
      .single()

    if (signatureError) {
      console.error('Signature insert error:', {
        error: signatureError,
        code: signatureError.code,
        message: signatureError.message,
        details: signatureError.details,
        hint: signatureError.hint
      })
      return NextResponse.json(
        { error: 'Failed to create signature: ' + signatureError.message },
        { status: 500 }
      )
    }

    console.log('Signature created successfully:', signature.id)

    // 4. The database trigger (handle_quote_acceptance) will automatically:
    // - Update quote status based on which signatures exist
    // - Update lead status to 'production' if both signatures complete
    // - Decline other quotes for the same lead
    // We don't manually update the quote status here anymore

    // 5. TODO: Generate signed PDF and save to storage
    // For now, we'll skip PDF generation and just return success
    // In next phase, we'll use a PDF library to:
    // - Generate PDF from quote data
    // - Embed signature image
    // - Upload to Supabase Storage
    // - Link file_id to quote

    return NextResponse.json({
      success: true,
      signature_id: signature.id,
      message: 'Quote accepted successfully',
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
