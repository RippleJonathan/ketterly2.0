import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendExecutedContractToCustomer } from '@/lib/email/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params

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

    // Get quote with lead data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        lead:leads(id, full_name, email, phone, address, city, state, zip)
      `)
      .eq('id', quoteId)
      .eq('company_id', userData.company_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: quoteError?.message || 'Quote not found' }, { status: 404 })
    }

    // Check if quote is accepted (customer has signed)
    if (quote.status !== 'accepted') {
      return NextResponse.json({
        error: 'Quote must be accepted (customer signed) before sending executed contract email'
      }, { status: 400 })
    }

    // Send the executed contract email
    const result = await sendExecutedContractToCustomer(quote, userData.companies)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Executed contract email sent successfully'
      })
    } else {
      return NextResponse.json({
        error: 'error' in result ? result.error : ('reason' in result ? result.reason : 'Failed to send email')
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error sending executed contract email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}