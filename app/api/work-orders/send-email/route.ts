import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { generateWorkOrderBuffer } from '@/lib/utils/pdf-generator-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const companyId = userData.company_id

    // Parse request body
    const body = await request.json()
    const { workOrderId, recipientEmail, recipientName } = body

    if (!workOrderId || !recipientEmail) {
      return NextResponse.json(
        { error: 'Work order ID and recipient email are required' },
        { status: 400 }
      )
    }

    // Fetch work order with all details
    const { data: workOrder, error: orderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        line_items:work_order_line_items(*)
      `)
      .eq('id', workOrderId)
      .eq('company_id', companyId)
      .single()

    if (orderError || !workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Generate PDF buffer
    const pdfBuffer = await generateWorkOrderBuffer({
      workOrder,
      company: {
        name: company.name,
        logo_url: company.logo_url,
        address: company.address,
        city: company.city,
        state: company.state,
        zip: company.zip,
        contact_phone: company.contact_phone,
        contact_email: company.contact_email,
      },
    })

    // Determine email subject and content
    const isInternalWork = !workOrder.subcontractor_name
    const subjectLine = isInternalWork
      ? `Work Order ${workOrder.work_order_number} - Internal Work`
      : `Work Order ${workOrder.work_order_number} from ${company.name}`

    // Send email with Resend
    try {
      const { data: emailData, error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'orders@ketterly.com',
        replyTo: company.contact_email || undefined,
        to: recipientEmail,
        subject: subjectLine,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                .button { display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .order-details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Work Order</h1>
                </div>
                <div class="content">
                  <p>Hello${recipientName ? ` ${recipientName}` : ''},</p>
                  
                  <p>Please find attached Work Order <strong>${workOrder.work_order_number}</strong> from ${company.name}.</p>
                  
                  <div class="order-details">
                    <h3>Work Order Details:</h3>
                    <p><strong>WO Number:</strong> ${workOrder.work_order_number}</p>
                    <p><strong>Title:</strong> ${workOrder.title}</p>
                    ${workOrder.scheduled_date ? `<p><strong>Scheduled Start:</strong> ${workOrder.scheduled_date}</p>` : ''}
                    ${workOrder.estimated_duration_hours ? `<p><strong>Estimated Hours:</strong> ${workOrder.estimated_duration_hours}</p>` : ''}
                    ${!isInternalWork && workOrder.subcontractor_name ? `<p><strong>Subcontractor:</strong> ${workOrder.subcontractor_name}</p>` : ''}
                    <p><strong>Total Items:</strong> ${workOrder.line_items?.length || 0}</p>
                    <p><strong>Subtotal:</strong> $${workOrder.subtotal?.toFixed(2) || '0.00'}</p>
                    ${workOrder.tax_amount && workOrder.tax_amount > 0 ? `<p><strong>Tax:</strong> $${workOrder.tax_amount.toFixed(2)}</p>` : ''}
                    <p><strong>Grand Total:</strong> $${workOrder.total_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  
                  ${workOrder.description ? `<p><strong>Description:</strong><br/>${workOrder.description}</p>` : ''}
                  
                  ${workOrder.special_instructions ? `<p><strong>Special Instructions:</strong><br/>${workOrder.special_instructions}</p>` : ''}
                  
                  <p>The complete work order details are attached as a PDF.</p>
                  
                  ${workOrder.job_site_address ? `
                    <div class="order-details">
                      <h3>Job Site:</h3>
                      <p>${workOrder.job_site_address}</p>
                      ${workOrder.job_site_city || workOrder.job_site_state || workOrder.job_site_zip ? `
                        <p>${workOrder.job_site_city || ''}${workOrder.job_site_state ? `, ${workOrder.job_site_state}` : ''} ${workOrder.job_site_zip || ''}</p>
                      ` : ''}
                    </div>
                  ` : ''}
                  
                  <p>If you have any questions, please contact us at:</p>
                  <p>
                    ${company.contact_email ? `Email: ${company.contact_email}<br/>` : ''}
                    ${company.contact_phone ? `Phone: ${company.contact_phone}` : ''}
                  </p>
                </div>
                <div class="footer">
                  <p>This is an automated email from ${company.name}.</p>
                  ${company.address ? `<p>${company.address}${company.city ? `, ${company.city}` : ''}${company.state ? `, ${company.state}` : ''} ${company.zip || ''}</p>` : ''}
                </div>
              </div>
            </body>
          </html>
        `,
        attachments: [
          {
            filename: `WO-${workOrder.work_order_number}.pdf`,
            content: pdfBuffer,
          },
        ],
      })

      if (sendError) {
        throw sendError
      }

      // Update work order email tracking
      await supabase
        .from('work_orders')
        .update({
          last_emailed_at: new Date().toISOString(),
          email_count: (workOrder.email_count || 0) + 1,
        })
        .eq('id', workOrderId)

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      })
    } catch (sendError: any) {
      return NextResponse.json(
        { error: 'Failed to send email', details: sendError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
