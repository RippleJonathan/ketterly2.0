import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendExecutedContractToCustomer } from '@/lib/email/notifications'

/**
 * POST /api/quotes/[id]/sign-company
 * 
 * Allows authenticated company users to sign a quote on behalf of the company.
 * Requires user to be logged in and belong to the quote's company.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    const body = await request.json()
    
    const {
      signer_name,
      signer_title,
      signature_data,
    } = body

    // Validate required fields
    if (!signer_name || !signature_data) {
      return NextResponse.json(
        { error: 'Missing required fields (signer_name, signature_data)' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Get user's company_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, email, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    // Fetch and validate quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, company_id, status, lead_id')
      .eq('id', quoteId)
      .eq('company_id', userData.company_id) // Ensure quote belongs to user's company
      .is('deleted_at', null)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found or access denied' },
        { status: 404 }
      )
    }

    // Check if company already signed
    const { data: existingSignature } = await supabase
      .from('quote_signatures')
      .select('id')
      .eq('quote_id', quoteId)
      .eq('signer_type', 'company_rep')
      .single()

    if (existingSignature) {
      return NextResponse.json(
        { error: 'Company representative has already signed this quote' },
        { status: 400 }
      )
    }

    // Insert company signature
    const { data: signature, error: signatureError } = await supabase
      .from('quote_signatures')
      .insert({
        quote_id: quoteId,
        company_id: quote.company_id,
        signer_name,
        signer_email: userData.email,
        signer_title,
        signature_data,
        accepted_terms: true,
        signer_type: 'company_rep',
        signer_user_agent: request.headers.get('user-agent') || null,
        signer_ip_address: request.headers.get('x-forwarded-for') || null,
      })
      .select('id')
      .single()

    if (signatureError) {
      console.error('Company signature error:', signatureError)
      return NextResponse.json(
        { error: 'Failed to create signature: ' + signatureError.message },
        { status: 500 }
      )
    }

    console.log('Company signature created successfully:', signature.id)

    // Check if both signatures are now complete (customer + company_rep)
    const adminClient = createAdminClient()
    const { data: allSignatures, error: sigError } = await adminClient
      .from('quote_signatures')
      .select('signer_type')
      .eq('quote_id', quoteId)
    
    const hasCustomerSig = allSignatures?.some(s => s.signer_type === 'customer')
    const hasCompanySig = allSignatures?.some(s => s.signer_type === 'company_rep')
    
    console.log('[DUAL SIGNATURE] Signature status:', {
      hasCustomerSig,
      hasCompanySig,
      bothComplete: hasCustomerSig && hasCompanySig
    })

    // If both signatures are complete, send executed contract email to customer
    if (hasCustomerSig && hasCompanySig) {
      console.log('[DUAL SIGNATURE] Both signatures complete - sending executed contract email')
      
      // Fetch full quote with relations
      const { data: fullQuote, error: quoteError } = await adminClient
        .from('quotes')
        .select('*, lead:leads(*), company:companies(*)')
        .eq('id', quoteId)
        .single()
      
      if (quoteError) {
        console.error('[DUAL SIGNATURE] Failed to fetch quote:', quoteError)
      }
      
      if (fullQuote?.lead && fullQuote?.company) {
        console.log('[DUAL SIGNATURE] Sending to:', fullQuote.lead.email)
        console.log('[DUAL SIGNATURE] Quote:', fullQuote.quote_number, 'Company:', fullQuote.company.name)
        
        try {
          const emailResult = await sendExecutedContractToCustomer(fullQuote, fullQuote.company)
          if (emailResult.success) {
            console.log('[DUAL SIGNATURE] ✅ Executed contract email sent successfully:', emailResult.data)
          } else {
            console.error('[DUAL SIGNATURE] ❌ Failed to send email:', emailResult.error)
          }
        } catch (emailError) {
          console.error('[DUAL SIGNATURE] ❌ Exception sending executed contract email:', emailError)
        }
      } else {
        console.error('[DUAL SIGNATURE] Missing quote/lead/company data - cannot send email')
      }
    }

    // Note: The database trigger will handle updating quote status and lead status
    // if both customer and company signatures now exist
    // PDF is generated on-demand via /api/quotes/[id]/pdf endpoint

    return NextResponse.json({
      success: true,
      signature_id: signature.id,
      message: 'Company signature added successfully',
    })
  } catch (error: any) {
    console.error('Company signature API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
