import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePDF } from '@/lib/utils/generate-invoice-pdf'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Await params in Next.js 15
    const { id } = await params

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { to, cc, subject, message } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }

    // Get invoice with all relations including location
    const { data: invoice, error: invoiceError } = await supabase
      .from('customer_invoices')
      .select(
        `
        *,
        companies (*),
        leads:leads!customer_invoices_lead_id_fkey(full_name, email, phone, address, city, state, zip, location_id, locations(id, name, address, city, state, zip, phone, email)),
        quotes (*),
        invoice_line_items (*)
      `
      )
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get company info
    const company = invoice.companies

    // Generate PDF HTML
    const invoiceHtml = generateInvoicePDF(invoice as any)

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: ${company?.primary_color || '#1e40af'};
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .invoice-summary {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .invoice-summary h3 {
      margin-top: 0;
      color: #333;
    }
    .amount {
      font-size: 24px;
      font-weight: bold;
      color: ${company?.primary_color || '#1e40af'};
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      background: ${company?.primary_color || '#1e40af'};
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      border-radius: 0 0 8px 8px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">${company?.name || 'Invoice'}</h1>
  </div>
  
  <div class="content">
    ${message || `<p>Dear ${invoice.lead?.full_name || 'Customer'},</p>
    
    <p>Thank you for your business! Please find your invoice attached below.</p>`}
    
    <div class="invoice-summary">
      <h3>Invoice Summary</h3>
      <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
      <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
      <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon receipt'}</p>
      
      <div class="amount">
        Amount Due: $${invoice.balance_due.toFixed(2)}
      </div>
      
      ${invoice.balance_due > 0 ? `
      <p style="color: #dc2626; font-weight: 600;">
        Payment is due by ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'receipt'}
      </p>
      ` : `
      <p style="color: #059669; font-weight: 600;">
        ✓ This invoice has been paid in full. Thank you!
      </p>
      `}
    </div>
    
    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/${invoice.id}/pdf" class="button">
        View Invoice PDF
      </a>
    </p>
    
    <p>If you have any questions about this invoice, please contact us at:</p>
    <p>
      ${company?.contact_phone ? `<strong>Phone:</strong> ${company.contact_phone}<br>` : ''}
      ${company?.contact_email ? `<strong>Email:</strong> ${company.contact_email}` : ''}
    </p>
    
    <p>Thank you for your business!</p>
    
    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>${company?.name || 'Your Company'}</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>This is an automated email. Please do not reply directly to this message.</p>
    <p>${company?.address ? `${company.address}, ${company.city || ''}, ${company.state || ''} ${company.zip || ''}` : ''}</p>
  </div>
</body>
</html>
    `

    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'invoices@ketterly.com',
      replyTo: company?.contact_email || undefined,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      subject: subject || `Invoice ${invoice.invoice_number} from ${company?.name || 'Your Company'}`,
      html: emailHtml,
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email', details: emailError },
        { status: 500 }
      )
    }

    // Update invoice status to 'sent' and record sent details
    const updateData: any = {
      sent_at: new Date().toISOString(),
      sent_to_email: to,
    }

    // If status is draft, change to sent
    if (invoice.status === 'draft') {
      updateData.status = 'sent'
    }

    const { error: updateError } = await supabase
      .from('customer_invoices')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      // Don't fail the request if update fails - email was sent successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      emailId: emailData?.id,
    })
  } catch (error) {
    console.error('Error sending invoice email:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to send invoice email', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
