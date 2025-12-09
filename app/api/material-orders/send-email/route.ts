import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { generatePurchaseOrderBuffer } from '@/lib/utils/pdf-generator-server'

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
    const { orderId, recipientEmails, recipientName, includeMaterialList } = body

    if (!orderId || !recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return NextResponse.json(
        { error: 'Order ID and at least one recipient email are required' },
        { status: 400 }
      )
    }

    const primaryEmail = recipientEmails[0]
    const ccEmails = recipientEmails.slice(1)

    // Fetch order with all details
    const { data: order, error: orderError } = await supabase
      .from('material_orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:material_order_items(*)
      `)
      .eq('id', orderId)
      .eq('company_id', companyId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
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

    // Generate PDF blob
    const pdfBuffer = await generatePurchaseOrderBuffer({
      order,
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

    // Create email record (status: sending)
    const { data: emailRecord, error: emailInsertError } = await supabase
      .from('material_order_emails')
      .insert({
        company_id: companyId,
        order_id: orderId,
        supplier_id: order.supplier_id,
        recipient_email: primaryEmail,
        recipient_name: recipientName || null,
        subject: `Purchase Order ${order.order_number} from ${company.name}`,
        status: 'sending',
        sent_by: user.id,
      })
      .select()
      .single()

    if (emailInsertError) {
      return NextResponse.json(
        { error: 'Failed to create email record' },
        { status: 500 }
      )
    }

    // Generate material list HTML if requested
    let materialListHtml = ''
    if (includeMaterialList && order.items && order.items.length > 0) {
      materialListHtml = `
        <div class="order-details">
          <h3>Material List:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: left;">Variant</th>
                <th style="padding: 8px; text-align: right;">Quantity</th>
                <th style="padding: 8px; text-align: center;">Unit</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item: any) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px;">${item.description}</td>
                  <td style="padding: 8px;">${item.variant_name || '-'}</td>
                  <td style="padding: 8px; text-align: right;">${item.quantity}</td>
                  <td style="padding: 8px; text-align: center;">${item.unit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    }

    // Send email with Resend
    try {
      const { data: emailData, error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'orders@ketterly.com',
        replyTo: company.contact_email || undefined,
        to: primaryEmail,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: `Purchase Order ${order.order_number} from ${company.name}`,
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
                  <h1>Purchase Order</h1>
                </div>
                <div class="content">
                  <p>Hello${recipientName ? ` ${recipientName}` : ''},</p>
                  
                  <p>Please find attached Purchase Order <strong>${order.order_number}</strong> from ${company.name}.</p>
                  
                  <div class="order-details">
                    <h3>Order Details:</h3>
                    <p><strong>PO Number:</strong> ${order.order_number}</p>
                    ${order.order_date ? `<p><strong>Order Date:</strong> ${order.order_date}</p>` : ''}
                    ${order.expected_delivery_date ? `<p><strong>Expected Delivery:</strong> ${order.expected_delivery_date}</p>` : ''}
                    <p><strong>Total Items:</strong> ${order.items?.length || 0}</p>
                    <p><strong>Total Amount:</strong> $${order.total_with_tax?.toFixed(2) || order.total_estimated?.toFixed(2)}</p>
                  </div>
                  
                  ${materialListHtml}
                  
                  ${order.notes ? `<p><strong>Notes:</strong><br/>${order.notes}</p>` : ''}
                  
                  <p>The complete purchase order details are attached as a PDF.</p>
                  
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
            filename: `PO-${order.order_number}.pdf`,
            content: pdfBuffer,
          },
        ],
      })

      if (sendError) {
        throw sendError
      }

      // Update email record to sent
      await supabase
        .from('material_order_emails')
        .update({ status: 'sent' })
        .eq('id', emailRecord.id)

      // Update order email tracking
      await supabase
        .from('material_orders')
        .update({
          last_emailed_at: new Date().toISOString(),
          email_count: (order.email_count || 0) + 1,
        })
        .eq('id', orderId)

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        emailId: emailRecord.id,
      })
    } catch (sendError: any) {
      // Update email record to failed
      await supabase
        .from('material_order_emails')
        .update({
          status: 'failed',
          error_message: sendError.message || 'Unknown error',
        })
        .eq('id', emailRecord.id)

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
