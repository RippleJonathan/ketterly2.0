import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/quotes/[id]/pdf?token=xxx (or authenticated)
 * 
 * Generates and returns a PDF for a quote.
 * Can be accessed via share token (public) or authenticated session (admin).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    const { searchParams } = new URL(request.url)
    const shareToken = searchParams.get('token')
    const internalKey = request.headers.get('x-internal-key')

    // Create Supabase client with SERVICE ROLE key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    let quote: any

    // Internal API call from server (e.g., email service)
    if (internalKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .is('deleted_at', null)
        .single()

      if (quoteError || !quoteData) {
        console.error('PDF quote fetch error:', quoteError)
        return new NextResponse('Quote not found', { status: 404 })
      }

      quote = quoteData
    }
    // If no token, check if user is authenticated
    else if (!shareToken) {
      const serverClient = await createServerClient()
      const { data: { user } } = await serverClient.auth.getUser()
      
      if (!user) {
        return new NextResponse('Authentication required', { status: 401 })
      }

      // Get user's company
      const { data: userData } = await serverClient
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData) {
        return new NextResponse('User not found', { status: 404 })
      }

      // Fetch quote with service client (must belong to user's company)
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('company_id', userData.company_id)
        .is('deleted_at', null)
        .single()

      if (quoteError || !quoteData) {
        console.error('PDF quote fetch error:', quoteError)
        return new NextResponse('Quote not found', { status: 404 })
      }

      quote = quoteData
    } else {
      // Public access via share token
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('share_token', shareToken)
        .is('deleted_at', null)
        .single()

      if (quoteError || !quoteData) {
        console.error('PDF quote fetch error:', quoteError)
        return new NextResponse(`Quote not found: ${quoteError?.message || 'No data'}`, { status: 404 })
      }

      quote = quoteData
    }

    // Fetch related data separately to avoid relationship ambiguity
    const [lineItemsResult, leadResult, companyResult, signaturesResult, userResult] = await Promise.all([
      supabase.from('quote_line_items').select('*').eq('quote_id', quoteId),
      supabase.from('leads').select('*').eq('id', quote.lead_id).single(),
      supabase.from('companies').select('*').eq('id', quote.company_id).single(),
      supabase.from('quote_signatures').select('*').eq('quote_id', quoteId),
      supabase.from('users').select('id, full_name, email').eq('id', quote.created_by).single()
    ])

    // Fetch location if lead has location_id
    let locationResult = null
    if (leadResult?.data?.location_id) {
      locationResult = await supabase.from('locations').select('*').eq('id', leadResult.data.location_id).single()
    }

    // Combine results
    const quoteWithRelations = {
      ...quote,
      quote_line_items: lineItemsResult.data || [],
      leads: leadResult.data,
      companies: companyResult.data,
      quote_signatures: signaturesResult.data || [],
      created_by_user: userResult.data,
      location: locationResult?.data // Add location data
    }

    // Handle company logo - fetch from private storage and convert to base64
    let companyLogoBase64 = null
    if (companyResult.data?.logo_url) {
      try {
        // Handle both signed URLs and direct URLs
        let filePath = ''
        if (companyResult.data.logo_url.includes('?')) {
          // Signed URL - extract path from URL
          const logoUrl = new URL(companyResult.data.logo_url)
          const pathParts = logoUrl.pathname.split('/')
          filePath = pathParts.slice(-2).join('/') // Get the last 2 parts (company-id/company-logos/logo-filename)
        } else {
          // Direct URL - extract path
          const logoUrl = new URL(companyResult.data.logo_url)
          const pathParts = logoUrl.pathname.split('/')
          filePath = pathParts.slice(-2).join('/') // Get the last 2 parts
        }

        const { data: logoBlob, error: logoError } = await supabase.storage
          .from('documents')
          .download(filePath)

        if (!logoError && logoBlob) {
          // Convert blob to base64
          const arrayBuffer = await logoBlob.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          const mimeType = logoBlob.type || 'image/png'
          companyLogoBase64 = `data:${mimeType};base64,${base64}`
        }
      } catch (error) {
        console.warn('Failed to fetch company logo:', error)
        // Continue without logo if fetch fails
      }
    }

    console.log('PDF quote fetched successfully:', {
      quoteId: quote.id,
      hasLineItems: lineItemsResult.data?.length || 0,
      hasLead: !!leadResult.data,
      hasCompany: !!companyResult.data,
      hasSignature: signaturesResult.data?.length || 0
    })

    // Generate HTML content
    const htmlContent = generateQuotePDF(quoteWithRelations, companyLogoBase64)

    // Convert HTML to PDF using Puppeteer
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    })
    
    await browser.close()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Quote-${quote.quote_number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return new NextResponse('Failed to generate PDF', { status: 500 })
  }
}

/**
 * Generate HTML representation of quote (temporary until we implement proper PDF)
 */
function generateQuotePDF(quote: any, companyLogoBase64?: string | null): string {
  // Extract relations - they come as arrays from Supabase
  const lineItems = quote.quote_line_items || []
  const lead = Array.isArray(quote.leads) ? quote.leads[0] : quote.leads
  const company = Array.isArray(quote.companies) ? quote.companies[0] : quote.companies
  const location = quote.location // Get location from quote
  const createdByUser = quote.created_by_user
  const signatures = quote.quote_signatures || []

  // Use location data if available, otherwise fallback to company data
  const displayName = location?.name || company?.name || 'Company Name'
  const displayAddress = location?.address || company?.address
  const displayCity = location?.city || company?.city
  const displayState = location?.state || company?.state
  const displayZip = location?.zip || company?.zip
  const displayPhone = location?.phone || company?.contact_phone
  const displayEmail = location?.email || company?.contact_email

  // Replace placeholders in contract terms
  let contractTerms = company?.contract_terms || ''
  if (contractTerms && company) {
    contractTerms = contractTerms
      .replace(/\[Company Name\]/g, company.name || '[Company Name]')
      .replace(/\[Company Address\]/g, company.address || '[Company Address]')
      .replace(/\[Company Email\]/g, company.contact_email || '[Company Email]')
      .replace(/\[Replacement Warranty\]/g, company.replacement_warranty_years?.toString() || '10')
      .replace(/\[Repair Warranty\]/g, company.repair_warranty_years?.toString() || '1')
  }
  const customerSignature = signatures.find((s: any) => s.signer_type === 'customer')
  const companySignature = signatures.find((s: any) => s.signer_type === 'company_rep')
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quote ${quote.quote_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
      background: #f9fafb;
      color: #111827;
    }
    .page {
      background: white;
      padding: 60px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .action-buttons {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .btn-secondary:hover {
      background: #f9fafb;
    }
    @media print {
      .action-buttons { display: none; }
      body { padding: 0; background: white; }
      .page { box-shadow: none; padding: 40px; }
    }
    
    /* Header with logo and company info */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 3px solid ${company?.primary_color || '#2563eb'};
    }
    .company-info {
      flex: 1;
    }
    .company-logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 15px;
    }
    .company-name {
      font-size: 28px;
      font-weight: 700;
      color: ${company?.primary_color || '#2563eb'};
      margin-bottom: 8px;
    }
    .company-details {
      font-size: 13px;
      line-height: 1.6;
      color: #6b7280;
    }
    .quote-meta {
      text-align: right;
    }
    .quote-title {
      font-size: 36px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
    }
    .quote-number {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 10px;
      ${quote.status === 'accepted' 
        ? 'background: #d1fae5; color: #065f46;' 
        : quote.status === 'sent' || quote.status === 'viewed'
        ? 'background: #fef3c7; color: #92400e;'
        : 'background: #e5e7eb; color: #374151;'}
    }
    
    /* Two-column layout for customer and rep info */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid ${company?.primary_color || '#2563eb'};
    }
    .info-box-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .info-box-content {
      font-size: 14px;
      line-height: 1.8;
      color: #111827;
    }
    .info-box-content strong {
      display: block;
      font-size: 16px;
      margin-bottom: 4px;
      color: #111827;
    }
    
    /* Line items table */
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 30px 0 15px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background: #f9fafb;
    }
    th {
      text-align: left;
      padding: 14px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    th.text-right {
      text-align: right;
    }
    td {
      padding: 16px 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
      color: #374151;
    }
    td.text-right {
      text-align: right;
    }
    .item-description {
      font-weight: 500;
      color: #111827;
      margin-bottom: 4px;
    }
    .item-category {
      font-size: 12px;
      color: #6b7280;
    }
    
    /* Totals section */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 30px;
    }
    .totals {
      min-width: 350px;
      background: #f9fafb;
      padding: 24px;
      border-radius: 8px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
      color: #374151;
    }
    .total-row.subtotal {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 12px;
      margin-bottom: 8px;
    }
    .total-row.final {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      padding-top: 16px;
      margin-top: 8px;
      border-top: 2px solid ${company?.primary_color || '#2563eb'};
    }
    
    /* Terms and notes */
    .terms {
      margin-top: 40px;
      padding: 24px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.7;
      color: #78350f;
      white-space: pre-wrap;
    }
    .terms strong {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    /* Signature section */
    .signature-section {
      margin-top: 50px;
      padding: 30px;
      background: #f0fdf4;
      border: 2px solid #86efac;
      border-radius: 8px;
    }
    .signature-title {
      font-size: 18px;
      font-weight: 700;
      color: #166534;
      margin-bottom: 8px;
      text-align: center;
    }
    .signature-subtitle {
      font-size: 13px;
      color: #15803d;
      margin-bottom: 24px;
      text-align: center;
    }
    .signature-box {
      margin: 30px 0;
      text-align: center;
    }
    .signature-label {
      font-size: 14px;
      font-weight: 600;
      color: #166534;
      margin-bottom: 12px;
    }
    .signature-image {
      max-width: 300px;
      height: auto;
      margin: 20px auto;
      padding: 20px;
      background: white;
      border: 2px solid #86efac;
      border-radius: 8px;
      display: block;
    }
    .signature-name {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
      margin-top: 8px;
    }
    .signature-date {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    
    /* Footer */
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header with logo and company info -->
    <div class="header">
      <div class="company-info">
        ${companyLogoBase64 ? `<img src="${companyLogoBase64}" alt="Company Logo" class="company-logo">` : ''}
        <div class="company-name">${company?.name || 'Company Name'}</div>
        ${location ? `<div style="font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 10px;">${location.name}</div>` : ''}
        <div class="company-details">
          ${displayAddress ? `${displayAddress}<br>` : ''}
          ${displayCity ? `${displayCity}, ${displayState} ${displayZip}<br>` : ''}
          ${displayEmail ? `${displayEmail}<br>` : ''}
          ${displayPhone ? `${displayPhone}<br>` : ''}
          ${company?.license_number ? `License: ${company.license_number}` : ''}
        </div>
      </div>
      <div class="quote-meta">
        <div class="quote-title">QUOTE</div>
        <div class="quote-number">#${quote.quote_number}</div>
        ${quote.option_label ? `<div class="quote-number">${quote.option_label}</div>` : ''}
        <div class="status-badge">${quote.status.toUpperCase()}</div>
      </div>
    </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div>
      <strong>${lead?.full_name || 'Customer'}</strong><br>
      ${lead?.email || ''}<br>
      ${lead?.phone || ''}<br>
      ${lead?.address ? `${lead.address}<br>` : ''}
      ${lead?.city ? `${lead.city}, ${lead.state} ${lead.zip}` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Quote Details</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item: any) => `
          <tr>
            <td>
              <div><strong>${item.description}</strong></div>
              <div style="font-size: 11px; color: #6b7280;">${item.category}</div>
              ${item.notes ? `<div style="margin-top:8px;font-size:12px;color:#4b5563;white-space:pre-wrap;">${item.notes}</div>` : ''}
            </td>
            <td class="text-right">${item.quantity} ${item.unit || ''}</td>
            <td class="text-right">$${Number(item.unit_price || 0).toFixed(2)}</td>
            <td class="text-right"><strong>$${Number(item.line_total || 0).toFixed(2)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>$${quote.subtotal.toFixed(2)}</span>
      </div>
      ${quote.tax_amount > 0 ? `
        <div class="total-row">
          <span>Tax (${(quote.tax_rate * 100).toFixed(2)}%)</span>
          <span>$${quote.tax_amount.toFixed(2)}</span>
        </div>
      ` : ''}
      ${quote.discount_amount > 0 ? `
        <div class="total-row">
          <span>Discount</span>
          <span style="color: #16a34a;">-$${quote.discount_amount.toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="total-row final">
        <span>Total</span>
        <span>$${quote.total_amount.toFixed(2)}</span>
      </div>
    </div>
  </div>

  ${quote.payment_terms || contractTerms ? `
    <div class="section">
      <div class="section-title">Terms & Conditions</div>
      <div class="terms">
        ${quote.payment_terms ? `<strong>Payment Terms:</strong><br>${quote.payment_terms}<br><br>` : ''}
        ${contractTerms ? `<strong>Contract Terms:</strong><br>${contractTerms}` : ''}
      </div>
    </div>
  ` : ''}

  ${customerSignature || companySignature ? `
    <div class="signature-section">
      <div style="font-size: 18px; font-weight: bold; color: #166534; margin-bottom: 8px;">
        ${customerSignature && companySignature ? '✓ Fully Executed Contract' : '⏳ Partially Signed'}
      </div>
      
      ${customerSignature ? `
        <div style="margin-bottom: 30px;">
          <div style="font-size: 14px; font-weight: 600; color: #166534; margin-bottom: 12px;">
            Customer Signature
          </div>
          <div style="font-size: 12px; color: #166534; margin-bottom: 12px;">
            Signed by ${customerSignature.signer_name} on ${new Date(customerSignature.signed_at).toLocaleDateString()}
          </div>
          <img src="${customerSignature.signature_data}" class="signature-image" alt="Customer Signature">
        </div>
      ` : ''}
      
      ${companySignature ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 14px; font-weight: 600; color: #166534; margin-bottom: 12px;">
            Company Representative Signature
          </div>
          <div style="font-size: 12px; color: #166534; margin-bottom: 12px;">
            Signed by ${companySignature.signer_name}${companySignature.signer_title ? ` (${companySignature.signer_title})` : ''} on ${new Date(companySignature.signed_at).toLocaleDateString()}
          </div>
          <img src="${companySignature.signature_data}" class="signature-image" alt="Company Signature">
        </div>
      ` : ''}
    </div>
  ` : ''}

</body>
</html>
  `
}
