import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import React, { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { QuotePDFTemplate } from '@/components/admin/quotes/quote-pdf-template'

/**
 * GET /api/quotes/[id]/generate-pdf
 * 
 * Server-side PDF generation using the same @react-pdf/renderer template
 * as the client-side download button. This ensures consistent PDF formatting
 * for both downloads and email attachments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    const internalKey = request.headers.get('x-internal-key')

    // Require internal key for server-to-server calls
    if (internalKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Create Supabase client with SERVICE ROLE key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    console.log('[PDF Generate] Fetching quote:', quoteId)

    // Fetch quote with all relations
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(*),
        lead:leads(
          *,
          assigned_user:users!leads_assigned_to_fkey(id, full_name, email, phone)
        ),
        company:companies(*),
        signatures:quote_signatures!quote_signatures_quote_id_fkey(*),
        creator:users!quotes_created_by_fkey(id, full_name, email, phone)
      `)
      .eq('id', quoteId)
      .is('deleted_at', null)
      .single()

    if (quoteError) {
      console.error('[PDF Generate] Quote fetch error:', quoteError)
      return new NextResponse(`Quote fetch failed: ${quoteError.message}`, { status: 500 })
    }

    if (!quote) {
      console.error('[PDF Generate] Quote not found:', quoteId)
      return new NextResponse('Quote not found', { status: 404 })
    }

    console.log('[PDF Generate] Quote found:', quote.quote_number)

    // Extract related data from quote
    const lineItems = quote.line_items || []
    const lead = quote.lead
    const company = quote.company
    const signatures = quote.signatures || []
    const creator = quote.creator

    // Fetch change orders and contract separately
    const [changeOrdersResult, contractResult] = await Promise.all([
      supabase.from('change_orders').select(`
        *,
        line_items:change_order_line_items(*)
      `).eq('quote_id', quoteId).eq('status', 'approved').is('deleted_at', null),
      supabase.from('signed_contracts').select('*').eq('quote_id', quoteId).is('deleted_at', null).maybeSingle(),
    ])

    const changeOrders = changeOrdersResult.data || []
    const contract = contractResult.data

    // Build company address
    const addressParts = [
      company.address,
      company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
      company.zip
    ].filter(Boolean)
    const companyAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

    // Prepare quote with relations (match client-side structure)
    const quoteWithRelations = {
      ...quote,
      line_items: lineItems,
      lead: lead,
      company: company, // Add full company object for financing options
      creator: creator,
    }

    // Debug: Log the sales rep information being passed to PDF
    console.log('PDF Generation Debug:', {
      quoteId: quote.id,
      assignedUser: lead?.assigned_user,
      creator: creator,
      companyContact: {
        email: company.contact_email,
        phone: company.contact_phone
      }
    })

    // Generate PDF using React PDF template (same as client-side download)
    const pdfDoc = pdf(
      React.createElement(QuotePDFTemplate, {
        quote: quoteWithRelations,
        companyName: company.name,
        companyLogo: company.logo_url || undefined,
        companyAddress,
        companyPhone: company.contact_phone || undefined,
        companyEmail: company.contact_email || undefined,
        contractTerms: company.contract_terms || undefined,
        signatures: signatures.map(s => ({
          signer_name: s.signer_name,
          signer_type: s.signer_type,
          signer_title: s.signer_title,
          signature_data: s.signature_data,
          signed_at: s.signed_at,
        })),
        changeOrders: changeOrders.map(co => ({
          id: co.id,
          change_order_number: co.change_order_number,
          title: co.title,
          description: co.description,
          amount: co.amount,
          tax_amount: co.tax_amount,
          total: co.total,
          line_items: (co.line_items || []).map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            notes: item.notes,
          })),
        })),
        originalContractPrice: contract?.original_contract_price || contract?.original_total,
        originalSubtotal: contract?.original_subtotal,
        currentContractPrice: contract?.current_contract_price,
      } as any) as any
    )
    
    const blob = await pdfDoc.toBlob()
    const buffer = await blob.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Quote-${quote.quote_number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return new NextResponse(`Failed to generate PDF: ${error.message}`, { status: 500 })
  }
}
