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
 */
export async function sendQuoteToCustomer(
  quote: any,
  company: Company,
  sender: User
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
  })

  return await sendEmail({
    from: `${sender.full_name} via ${company.name} <noreply@ketterly.com>`,
    to: customerEmail,
    replyTo: sender.email,
    subject: `Your Roofing Estimate - ${quote.title}`,
    html,
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
