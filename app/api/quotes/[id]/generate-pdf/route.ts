import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import React from 'react'
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

    // Fetch quote with all relations
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .is('deleted_at', null)
      .single()

    if (quoteError || !quote) {
      return new NextResponse('Quote not found', { status: 404 })
    }

    // Fetch related data
    const [lineItemsResult, leadResult, companyResult, signaturesResult] = await Promise.all([
      supabase.from('quote_line_items').select('*').eq('quote_id', quoteId),
      supabase.from('leads').select('*').eq('id', quote.lead_id).single(),
      supabase.from('companies').select('*').eq('id', quote.company_id).single(),
      supabase.from('quote_signatures').select('*').eq('quote_id', quoteId),
    ])

    const lead = leadResult.data
    const company = companyResult.data
    const lineItems = lineItemsResult.data || []
    const signatures = signaturesResult.data || []

    if (!lead || !company) {
      return new NextResponse('Missing quote data', { status: 404 })
    }

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
    }

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
      })
    )
    
    const pdfBuffer = await pdfDoc.toBuffer()

    return new NextResponse(pdfBuffer, {
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
