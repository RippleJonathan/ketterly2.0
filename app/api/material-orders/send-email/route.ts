import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

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
    const { orderId, recipientEmails, recipientName, includeMaterialList, materialOrderIds } = body

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

    // Generate order items HTML (always show for the main order)
    let orderItemsHtml = ''
    if (order.items && order.items.length > 0) {
      const isWorkOrder = order.order_type === 'work'
      orderItemsHtml = `
        <div class="order-details">
          <h3>${isWorkOrder ? 'Work Order Items:' : 'Order Items:'}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                <th style="padding: 8px; text-align: left;">Item</th>
                ${!isWorkOrder ? '<th style="padding: 8px; text-align: left;">Variant</th>' : ''}
                <th style="padding: 8px; text-align: right;">Quantity</th>
                <th style="padding: 8px; text-align: center;">Unit</th>
                <th style="padding: 8px; text-align: right;">Unit Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item: any) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px;">${item.description}</td>
                  ${!isWorkOrder ? `<td style="padding: 8px;">${item.variant_name || '-'}</td>` : ''}
                  <td style="padding: 8px; text-align: right;">${item.quantity}</td>
                  <td style="padding: 8px; text-align: center;">${item.unit}</td>
                  <td style="padding: 8px; text-align: right;">${formatCurrency(item.estimated_unit_cost || 0)}</td>
                  <td style="padding: 8px; text-align: right;">${formatCurrency((item.quantity * (item.estimated_unit_cost || 0)))}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #d1d5db; font-weight: bold;">
                <td colspan="${isWorkOrder ? '4' : '5'}" style="padding: 8px; text-align: right;">Subtotal:</td>
                <td style="padding: 8px; text-align: right;">${formatCurrency(order.total_estimated || 0)}</td>
              </tr>
              ${!isWorkOrder && order.tax_amount && order.tax_amount > 0 ? `
                <tr style="font-weight: bold;">
                  <td colspan="${isWorkOrder ? '4' : '5'}" style="padding: 8px; text-align: right;">Tax (${(order.tax_rate * 100).toFixed(2)}%):</td>
                  <td style="padding: 8px; text-align: right;">${formatCurrency(order.tax_amount)}</td>
                </tr>
              ` : ''}
              <tr style="font-weight: bold; font-size: 1.1em;">
                <td colspan="${isWorkOrder ? '4' : '5'}" style="padding: 8px; text-align: right;">Total:</td>
                <td style="padding: 8px; text-align: right;">${formatCurrency(order.total_with_tax || order.total_estimated || 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
    }

    // Generate material list HTML if requested (for work orders with material orders selected)
    let materialListHtml = ''
    if (includeMaterialList && order.order_type === 'work' && materialOrderIds && materialOrderIds.length > 0) {
      const { data: materialOrders } = await supabase
        .from('material_orders')
        .select('items:material_order_items(*)')
        .in('id', materialOrderIds)
        .eq('company_id', companyId)
        .eq('order_type', 'material')
      
      if (materialOrders) {
        const itemsForList = materialOrders.flatMap(mo => mo.items || [])
        
        if (itemsForList.length > 0) {
          materialListHtml = `
            <div class="order-details">
              <h3>Materials Included:</h3>
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
                  ${itemsForList.map((item: any) => `
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
      }
    }

    // Create email record (status: sending)
    const orderTypeLabel = order.order_type === 'work' ? 'Work Order' : 'Purchase Order'
    const { data: emailRecord, error: emailInsertError } = await supabase
      .from('material_order_emails')
      .insert({
        company_id: companyId,
        order_id: orderId,
        supplier_id: order.supplier_id,
        recipient_email: primaryEmail,
        recipient_name: recipientName || null,
        subject: `${orderTypeLabel} ${order.order_number} from ${company.name}`,
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

    // Send email with Resend
    try {
      const { data: emailData, error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'orders@ketterly.com',
        replyTo: company.contact_email || undefined,
        to: primaryEmail,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: `${orderTypeLabel} ${order.order_number} from ${company.name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                .order-details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
                table { width: 100%; }
                th { font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${orderTypeLabel}</h1>
                </div>
                <div class="content">
                  <p>Hello${recipientName ? ` ${recipientName}` : ''},</p>
                  
                  <p>Please review ${orderTypeLabel} <strong>${order.order_number}</strong> from ${company.name}.</p>
                  
                  <div class="order-details">
                    <h3>Order Information:</h3>
                    <p><strong>${order.order_type === 'work' ? 'WO' : 'PO'} Number:</strong> ${order.order_number}</p>
                    ${order.order_date ? `<p><strong>Date:</strong> ${new Date(order.order_date).toLocaleDateString()}</p>` : ''}
                    ${order.expected_delivery_date ? `<p><strong>Expected Delivery:</strong> ${new Date(order.expected_delivery_date).toLocaleDateString()}</p>` : ''}
                  </div>
                  
                  ${orderItemsHtml}
                  
                  ${materialListHtml}
                  
                  ${order.notes ? `
                    <div class="order-details">
                      <h3>Notes:</h3>
                      <p>${order.notes}</p>
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
