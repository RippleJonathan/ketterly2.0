/**
 * Email Service - Central email sending logic for Ketterly CRM
 * 
 * This service handles:
 * - Checking notification settings before sending
 * - Using sender's email address for personalization
 * - Sending via Resend with proper from/reply-to fields
 */

import { sendEmail } from './resend'
import {
  emailLayout,
  quoteEmailTemplate,
  quoteAcceptedNotificationTemplate,
  invoiceEmailTemplate,
  paymentConfirmationTemplate,
} from './templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency } from '@/lib/utils/formatting'
import { format } from 'date-fns'
import { sendPushNotification } from '@/lib/api/onesignal'

interface User {
  id: string
  email: string
  full_name: string
  phone?: string | null
}

interface Company {
  id: string
  name: string
  logo_url?: string | null
  primary_color?: string
  contact_email?: string | null
  contact_phone?: string | null
}

interface NotificationSettings {
  quote_sent_to_customer: boolean
  quote_accepted_notify_team: boolean
  invoice_sent_to_customer: boolean
  payment_received_confirmation: boolean
  change_order_sent_to_customer?: boolean
  notification_email?: string | null
  // ... other settings
}

/**
 * Get notification settings for a company
 */
async function getNotificationSettings(companyId: string): Promise<NotificationSettings | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error) {
    // If no row exists, create with sensible defaults
    if ((error as any)?.code === 'PGRST116') {
      try {
        // Use admin client to bypass RLS for auto-creation
        const adminClient = createAdminClient()
        const defaults = {
          company_id: companyId,
          quote_sent_to_customer: true,
          quote_accepted_notify_team: true,
          invoice_sent_to_customer: true,
          payment_received_confirmation: true,
          notification_email: null,
        }

        const { data: created, error: createError } = await adminClient
          .from('notification_settings')
          .insert(defaults as any)
          .select('*')
          .single()

        if (createError) {
          console.error('Failed to create default notification settings:', createError)
          // Return safe defaults if table doesn't exist or other error
          return {
            quote_sent_to_customer: true,
            quote_accepted_notify_team: true,
            invoice_sent_to_customer: true,
            payment_received_confirmation: true,
            notification_email: null,
          }
        }

        return created as unknown as NotificationSettings
      } catch (e) {
        console.error('Exception creating notification settings:', e)
        // Return safe defaults
        return {
          quote_sent_to_customer: true,
          quote_accepted_notify_team: true,
          invoice_sent_to_customer: true,
          payment_received_confirmation: true,
          notification_email: null,
        }
      }
    }

    console.error('Failed to fetch notification settings:', error)
    return null
  }

  return data
}

/**
 * Get team members to notify (admins and managers)
 */
async function getTeamEmails(companyId: string): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('company_id', companyId)
    .in('role', ['super_admin', 'admin', 'manager'])
    .eq('is_active', true)
    .is('deleted_at', null)

  if (error) {
    console.error('Failed to fetch team emails:', error)
    return []
  }

  return data.map(u => u.email)
}

/**
 * Get team member user IDs for push notifications
 */
async function getTeamUserIds(companyId: string): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .in('role', ['super_admin', 'admin', 'manager'])
    .eq('is_active', true)
    .is('deleted_at', null)

  if (error) {
    console.error('Failed to fetch team user IDs:', error)
    return []
  }

  return data.map(u => u.id)
}

/**
 * Check if user has push notifications enabled
 */
async function shouldSendPushNotification(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('push_notifications')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return data.push_notifications ?? false
}

/**
 * Send quote to customer
 * @param includePdf - If true, generates and attaches the quote PDF
 */
export async function sendQuoteToCustomer(
  quote: any,
  company: Company,
  sender: User,
  includePdf: boolean = false
) {
  const settings = await getNotificationSettings(company.id)
  
  if (!settings?.quote_sent_to_customer) {
    console.log('Quote email notifications are disabled for this company')
    return { success: false, reason: 'disabled' }
  }

  const customerEmail = quote.lead?.email || quote.customer?.email
  if (!customerEmail) {
    return { success: false, error: 'No customer email found' }
  }

  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quote/${quote.share_token}`

  const html = quoteEmailTemplate({
    companyName: company.name,
    companyLogo: company.logo_url || undefined,
    primaryColor: company.primary_color,
    customerName: quote.lead?.full_name || quote.customer?.full_name || 'Customer',
    quoteNumber: quote.quote_number,
    quoteTitle: quote.title,
    totalAmount: formatCurrency(quote.total_amount),
    validUntil: format(new Date(quote.valid_until), 'MMMM dd, yyyy'),
    viewQuoteUrl: quoteUrl,
    senderName: sender.full_name,
    senderPhone: sender.phone || company.contact_phone || undefined,
  })

  let attachments = undefined
  if (includePdf) {
    // Fetch the PDF using the same template as the download button
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/quotes/${quote.id}/generate-pdf`
    console.log('Fetching PDF for email attachment:', pdfUrl)
    try {
      const pdfResponse = await fetch(pdfUrl, {
        headers: {
          'x-internal-key': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        }
      })
      console.log('PDF fetch response status:', pdfResponse.status, pdfResponse.statusText)
      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer()
        console.log('PDF buffer size:', pdfBuffer.byteLength, 'bytes')
        attachments = [{
          filename: `Quote-${quote.quote_number}.pdf`,
          content: Buffer.from(pdfBuffer),
        }]
        console.log('PDF attachment created successfully')
      } else {
        console.error('PDF fetch failed:', pdfResponse.status, await pdfResponse.text())
      }
    } catch (error) {
      console.error('Failed to fetch PDF for attachment:', error)
      // Continue without attachment rather than failing the email
    }
  } else {
    console.log('includePdf is false, skipping PDF attachment')
  }

  console.log('Sending quote email to:', customerEmail, 'with attachments:', attachments ? 'YES' : 'NO')
  return await sendEmail({
    from: `${sender.full_name} via ${company.name} <notifications@ketterly.com>`,
    to: customerEmail,
    replyTo: sender.email,
    subject: `Your Roofing Estimate - ${quote.title}`,
    html,
    attachments,
  })
}

/**
 * Notify team when quote is accepted
 */
export async function notifyTeamQuoteAccepted(
  quote: any,
  company: Company,
  signature: any
) {
  const settings = await getNotificationSettings(company.id)
  
  if (!settings?.quote_accepted_notify_team) {
    console.log('Quote accepted notifications are disabled for this company')
    return { success: false, reason: 'disabled' }
  }

  const teamEmails = await getTeamEmails(company.id)
  if (teamEmails.length === 0) {
    return { success: false, error: 'No team members to notify' }
  }

  // Use notification email if specified, otherwise send to all team members
  const recipients = settings.notification_email 
    ? [settings.notification_email]
    : teamEmails

  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${quote.lead_id}`

  const html = quoteAcceptedNotificationTemplate({
    companyName: company.name,
    companyLogo: company.logo_url || undefined,
    primaryColor: company.primary_color,
    quoteNumber: quote.quote_number,
    quoteTitle: quote.title,
    customerName: quote.lead?.full_name || quote.customer?.full_name || 'Customer',
    totalAmount: formatCurrency(quote.total_amount),
    signedBy: signature.signer_name,
    signedAt: format(new Date(signature.signed_at), 'MMMM dd, yyyy h:mm a'),
    viewQuoteUrl: quoteUrl,
  })

  // Send email notification
  const emailResult = await sendEmail({
    from: 'Ketterly CRM <notifications@ketterly.com>',
    to: recipients,
    subject: `🎉 Quote Accepted - ${quote.title}`,
    html,
  })

  // Send push notification to team
  try {
    const teamUserIds = await getTeamUserIds(company.id)
    
    // Filter for users with push enabled
    const usersWithPushEnabled = []
    for (const userId of teamUserIds) {
      const canSendPush = await shouldSendPushNotification(userId)
      if (canSendPush) {
        usersWithPushEnabled.push(userId)
      }
    }
    
    if (usersWithPushEnabled.length > 0) {
      await sendPushNotification({
        userIds: usersWithPushEnabled,
        title: '🎉 Quote Accepted',
        message: `${quote.lead?.full_name || 'Customer'} accepted ${quote.title} for ${formatCurrency(quote.total_amount)}`,
        url: quoteUrl,
        data: {
          type: 'quote_accepted',
          quoteId: quote.id,
          leadId: quote.lead_id,
          icon: company.logo_url || undefined,
          image: company.logo_url || undefined,
        },
      })
    }
  } catch (error) {
    console.error('Failed to send push notification:', error)
    // Don't fail the whole operation if push fails
  }

  return emailResult
}

/**
 * Send invoice to customer
 */
export async function sendInvoiceToCustomer(
  invoice: any,
  company: Company,
  sender: User
) {
  const settings = await getNotificationSettings(company.id)
  
  if (!settings?.invoice_sent_to_customer) {
    console.log('Invoice email notifications are disabled for this company')
    return { success: false, reason: 'disabled' }
  }

  const customerEmail = invoice.lead?.email || invoice.customer?.email
  if (!customerEmail) {
    return { success: false, error: 'No customer email found' }
  }

  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${invoice.id}` // TODO: Create public invoice view

  const html = invoiceEmailTemplate({
    companyName: company.name,
    companyLogo: company.logo_url || undefined,
    primaryColor: company.primary_color,
    customerName: invoice.lead?.full_name || invoice.customer?.full_name || 'Customer',
    invoiceNumber: invoice.invoice_number,
    invoiceType: invoice.invoice_type,
    totalAmount: formatCurrency(invoice.total_amount),
    dueDate: format(new Date(invoice.due_date), 'MMMM dd, yyyy'),
    viewInvoiceUrl: invoiceUrl,
    senderName: sender.full_name,
  })

  return await sendEmail({
    from: `${sender.full_name} via ${company.name} <noreply@ketterly.com>`,
    to: customerEmail,
    replyTo: sender.email,
    subject: `Invoice ${invoice.invoice_number} - ${company.name}`,
    html,
  })
}

/**
 * Send payment confirmation to customer
 */
export async function sendPaymentConfirmation(
  payment: any,
  invoice: any,
  company: Company
) {
  const settings = await getNotificationSettings(company.id)
  
  if (!settings?.payment_received_confirmation) {
    console.log('Payment confirmation emails are disabled for this company')
    return { success: false, reason: 'disabled' }
  }

  const customerEmail = invoice.lead?.email || invoice.customer?.email
  if (!customerEmail) {
    return { success: false, error: 'No customer email found' }
  }

  const html = paymentConfirmationTemplate({
    companyName: company.name,
    companyLogo: company.logo_url || undefined,
    primaryColor: company.primary_color,
    customerName: invoice.lead?.full_name || invoice.customer?.full_name || 'Customer',
    paymentAmount: formatCurrency(payment.amount),
    paymentMethod: payment.payment_method,
    invoiceNumber: invoice.invoice_number,
    remainingBalance: formatCurrency(invoice.balance_due - payment.amount),
  })

  return await sendEmail({
    from: `${company.name} <noreply@ketterly.com>`,
    to: customerEmail,
    replyTo: company.contact_email || undefined,
    subject: `Payment Received - Thank You!`,
    html,
  })
}

/**
 * Send fully executed contract to customer (both signatures complete)
 */
export async function sendExecutedContractToCustomer(
  quote: any,
  company: Company
) {
  const settings = await getNotificationSettings(company.id)
  
  if (!settings?.quote_sent_to_customer) {
    console.log('Quote email notifications are disabled for this company')
    return { success: false, reason: 'disabled' }
  }

  const customerEmail = quote.lead?.email || quote.customer?.email
  if (!customerEmail) {
    return { success: false, error: 'No customer email found' }
  }

  // Generate PDF using the same template as the download button
  // Use the new generate-pdf endpoint that uses @react-pdf/renderer
  const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/quotes/${quote.id}/generate-pdf`
  console.log('[Executed Contract] Fetching PDF (React PDF template):', pdfUrl)
  
  let pdfAttachment = undefined
  try {
    const pdfResponse = await fetch(pdfUrl, {
      headers: {
        'x-internal-key': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      }
    })
    console.log('[Executed Contract] PDF fetch status:', pdfResponse.status, pdfResponse.statusText)
    if (pdfResponse.ok) {
      const pdfBuffer = await pdfResponse.arrayBuffer()
      console.log('[Executed Contract] PDF buffer size:', pdfBuffer.byteLength, 'bytes')
      pdfAttachment = {
        filename: `Signed-Contract-${quote.quote_number}.pdf`,
        content: Buffer.from(pdfBuffer),
      }
      console.log('[Executed Contract] PDF attachment created successfully')
    } else {
      const errorText = await pdfResponse.text()
      console.error('[Executed Contract] PDF fetch failed:', pdfResponse.status, errorText)
      return { success: false, error: `Failed to generate PDF: ${pdfResponse.status}` }
    }
  } catch (error) {
    console.error('[Executed Contract] Failed to fetch PDF for attachment:', error)
    return { success: false, error: 'Failed to generate PDF attachment' }
  }
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-width: 150px; margin-bottom: 20px;">` : ''}
      
      <h1 style="color: ${company.primary_color || '#2563eb'}; margin-bottom: 10px;">Your Signed Contract is Ready!</h1>
      
      <p style="color: #374151; line-height: 1.6;">
        Dear ${quote.lead?.full_name || quote.customer?.full_name || 'Customer'},
      </p>
      
      <p style="color: #374151; line-height: 1.6;">
        Great news! Your contract for <strong>${quote.title || quote.option_label}</strong> (Quote #${quote.quote_number}) has been fully executed by both parties.
      </p>
      
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-weight: 600;">✓ Contract Amount: ${formatCurrency(quote.total_amount)}</p>
        <p style="margin: 8px 0 0 0; color: #166534;">Both you and our company representative have signed the agreement.</p>
      </div>
      
      <p style="color: #374151; line-height: 1.6;">
        Attached to this email, you'll find the fully executed contract PDF for your records. Please keep this for your files.
      </p>
      
      <p style="color: #374151; line-height: 1.6;">
        We're excited to get started on your project! If you have any questions, please don't hesitate to reach out.
      </p>
      
      <p style="color: #374151; line-height: 1.6; margin-top: 32px;">
        Best regards,<br>
        <strong>${company.name}</strong>${company.contact_phone ? `<br>${company.contact_phone}` : ''}${company.contact_email ? `<br>${company.contact_email}` : ''}
      </p>
    </div>
  `

  console.log('[Executed Contract] Sending email to:', customerEmail)
  return await sendEmail({
    from: `${company.name} <notifications@ketterly.com>`,
    to: customerEmail,
    replyTo: company.contact_email || undefined,
    subject: `✓ Signed Contract - ${quote.title || quote.quote_number}`,
    html,
    attachments: pdfAttachment ? [pdfAttachment] : undefined,
  })
}

/**
 * Send a document file to customer email
 */
export async function sendDocumentToCustomer(
  document: any,
  lead: any,
  company: Company,
  sender: User,
  fileBuffer: ArrayBuffer
) {
  const customerEmail = lead?.email
  if (!customerEmail) {
    return { success: false, error: 'No customer email found' }
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-width: 150px; margin-bottom: 20px;">` : ''}
      
      <h1 style="color: ${company.primary_color || '#2563eb'}; margin-bottom: 10px;">Document Shared With You</h1>
      
      <p style="color: #374151; line-height: 1.6;">
        Hello ${lead.full_name || 'Customer'},
      </p>
      
      <p style="color: #374151; line-height: 1.6;">
        ${sender.full_name} from ${company.name} has shared a document with you:
      </p>
      
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0; font-weight: 600; color: #111827;">${document.title}</p>
        ${document.description ? `<p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">${document.description}</p>` : ''}
      </div>
      
      <p style="color: #374151; line-height: 1.6;">
        The document is attached to this email for your review.
      </p>
      
      <p style="color: #374151; line-height: 1.6;">
        If you have any questions, please feel free to reply to this email.
      </p>
      
      <p style="color: #374151; line-height: 1.6; margin-top: 32px;">
        Best regards,<br>
        <strong>${sender.full_name}</strong><br>
        ${company.name}<br>
        ${company.contact_phone || ''}<br>
        ${sender.email}
      </p>
    </div>
  `

  console.log('Sending document email to:', customerEmail, 'file:', document.file_name)
  return await sendEmail({
    from: `${sender.full_name} via ${company.name} <notifications@ketterly.com>`,
    to: customerEmail,
    replyTo: sender.email,
    subject: `Document from ${company.name} - ${document.title}`,
    html,
    attachments: [{
      filename: document.file_name,
      content: Buffer.from(fileBuffer),
    }],
  })
}

/**
 * Send change order to customer for signature
 */
export async function sendChangeOrderToCustomer(
  changeOrder: any,
  company: Company,
  sender: User
) {
  const settings = await getNotificationSettings(company.id)
  
  // Use quote setting as default if change_order setting not available
  if (!settings?.quote_sent_to_customer) {
    console.log('Change order email notifications are disabled for this company')
    return { success: false, reason: 'disabled' }
  }

  const customerEmail = changeOrder.lead?.email
  if (!customerEmail) {
    return { success: false, error: 'No customer email found' }
  }

  const signUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/change-order/${changeOrder.share_token}`

  const html = emailLayout(
    `
      <h1 style="color: #111827; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
        Change Order Requires Your Signature
      </h1>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        Hi ${changeOrder.lead?.full_name || 'there'},
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        We've prepared a change order for your project that requires your review and signature.
      </p>
      
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Change Order #:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${changeOrder.change_order_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Title:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${changeOrder.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formatCurrency(changeOrder.total)}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        Please review and sign this change order to proceed with the modifications to your project.
      </p>
      
      <table style="width: 100%; margin: 0 0 24px 0;">
        <tr>
          <td align="center">
            <a href="${signUrl}" 
               style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Review & Sign Change Order
            </a>
          </td>
        </tr>
      </table>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
        If you have any questions, please don't hesitate to reach out.
      </p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
        Best regards,<br>
        ${sender?.full_name || company.name}<br>
        ${company.name}${(sender?.phone || company.contact_phone) ? `<br>${sender?.phone || company.contact_phone}` : ''}
      </p>
    `,
    {
      companyName: company.name,
      companyLogo: company.logo_url || undefined,
      primaryColor: company.primary_color || '#1e40af',
    }
  )

  return await sendEmail({
    from: `${sender?.full_name || company.name} via ${company.name} <notifications@ketterly.com>`,
    to: customerEmail,
    replyTo: sender?.email || company.contact_email || undefined,
    subject: `Change Order #${changeOrder.change_order_number} - Signature Required`,
    html,
  })
}

/**
 * Send fully executed change order to customer
 */
export async function sendExecutedChangeOrder(
  changeOrder: any,
  company: Company
) {
  const customerEmail = changeOrder.lead?.email
  if (!customerEmail) {
    return { success: false, error: 'No customer email found' }
  }

  const html = emailLayout(
    `
      <h1 style="color: #111827; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
        Change Order Fully Executed
      </h1>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        Hi ${changeOrder.lead?.full_name || 'there'},
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        Your change order has been fully executed and approved by both parties.
      </p>
      
      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #166534; font-size: 14px;">Change Order #:</td>
            <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600; text-align: right;">${changeOrder.change_order_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #166534; font-size: 14px;">Title:</td>
            <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600; text-align: right;">${changeOrder.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #166534; font-size: 14px;">Amount:</td>
            <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600; text-align: right;">${formatCurrency(changeOrder.total)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #166534; font-size: 14px;">Status:</td>
            <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600; text-align: right;">Approved</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        Your project contract has been updated to reflect these changes. We'll proceed with the work as outlined in the change order.
      </p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
        Thank you for your business!
      </p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
        Best regards,<br>
        ${company.name}
      </p>
    `,
    {
      companyName: company.name,
      companyLogo: company.logo_url || undefined,
      primaryColor: company.primary_color || '#1e40af',
    }
  )

  return await sendEmail({
    from: `${company.name} <notifications@ketterly.com>`,
    to: customerEmail,
    replyTo: company.contact_email || undefined,
    subject: `Change Order #${changeOrder.change_order_number} - Approved`,
    html,
  })
}

