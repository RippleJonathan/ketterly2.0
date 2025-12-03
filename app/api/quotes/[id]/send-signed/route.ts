import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendExecutedContractToCustomer } from '@/lib/email/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params

    // Create Supabase client with SERVICE ROLE key (for admin access)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
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

    // Fetch quote with company and lead
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        lead:leads(id, full_name, email, phone),
        company:companies(*)
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: quoteError?.message || 'Quote not found' },
        { status: 404 }
      )
    }

    // Verify quote has both signatures
    const { data: signatures } = await supabase
      .from('quote_signatures')
      .select('signer_type')
      .eq('quote_id', quoteId)
    
    const hasCustomerSig = signatures?.some(s => s.signer_type === 'customer')
    const hasCompanySig = signatures?.some(s => s.signer_type === 'company_rep')
    
    if (!hasCustomerSig || !hasCompanySig) {
      return NextResponse.json(
        { error: 'Quote must be fully signed before emailing' },
        { status: 400 }
      )
    }

    // Check if lead has an email
    if (!quote.lead?.email) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    // Send email
    const result = await sendExecutedContractToCustomer(quote, quote.company)

    if (!result.success) {
      const errMsg = 'error' in result ? (result as any).error?.message || 'Failed to send email' : 'Failed to send email'
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send signed quote email error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
