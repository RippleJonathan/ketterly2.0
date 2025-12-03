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
}

interface NotificationSettings {
  quote_sent_to_customer: boolean
  quote_accepted_notify_team: boolean
  invoice_sent_to_customer: boolean
  payment_received_confirmation: boolean
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

  return await sendEmail({
    from: 'Ketterly CRM <notifications@ketterly.com>',
    to: recipients,
    subject: `🎉 Quote Accepted - ${quote.title}`,
    html,
  })
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
        <strong>${company.name}</strong><br>
        ${company.contact_phone || ''}<br>
        ${company.contact_email || ''}
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
