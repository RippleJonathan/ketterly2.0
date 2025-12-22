/**
 * User Notification Service
 * 
 * Checks user notification preferences before sending emails.
 * Respects individual user settings for each notification type.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from './resend'
import {
  newLeadEmailTemplate,
  leadAssignedEmailTemplate,
  leadStatusChangedEmailTemplate,
  appointmentScheduledEmailTemplate,
  appointmentReminderEmailTemplate,
  quoteSentNotificationTemplate,
  quoteApprovedNotificationTemplate,
  contractSignedNotificationTemplate,
  paymentReceivedNotificationTemplate,
  dailySummaryEmailTemplate,
} from './notification-templates'
import { sendPushNotification } from '@/lib/api/onesignal'

interface UserNotificationPreferences {
  email_notifications: boolean
  notification_preferences: Record<string, boolean>
}

/**
 * Get user notification preferences
 */
async function getUserPreferences(userId: string): Promise<UserNotificationPreferences | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('email_notifications, notification_preferences, email, full_name')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Failed to get user preferences:', error)
    return null
  }

  return {
    email_notifications: data.email_notifications ?? true,
    notification_preferences: data.notification_preferences || {},
  }
}

/**
 * Check if user wants this notification type
 */
function shouldSendNotification(
  preferences: UserNotificationPreferences | null,
  notificationType: string
): boolean {
  if (!preferences) return true // Default to sending if can't check
  
  // Check master toggle
  if (!preferences.email_notifications) return false
  
  // Check specific notification preference
  const specificPref = preferences.notification_preferences[notificationType]
  return specificPref !== false // Default to true if not explicitly disabled
}

/**
 * Check if user wants push notifications for this type
 */
async function shouldSendPushNotification(
  userId: string,
  notificationType: string
): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('push_notifications, notification_preferences')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  
  // Check master push toggle
  if (!data.push_notifications) return false
  
  // Check specific notification preference (same as email for now)
  const specificPref = data.notification_preferences?.[notificationType]
  return specificPref !== false // Default to true if not explicitly disabled
}

/**
 * Get company details for email branding
 */
async function getCompanyDetails(companyId: string) {
  const supabase = createAdminClient()
  
  const { data } = await supabase
    .from('companies')
    .select('name, primary_color, logo_url')
    .eq('id', companyId)
    .single()

  return data || { name: 'Your Company', primary_color: '#1e40af', logo_url: null }
}

/**
 * Get user email and name
 */
async function getUserDetails(userId: string) {
  const supabase = createAdminClient()
  
  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  return data
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================

/**
 * Send new lead notification
 */
export async function notifyNewLead(data: {
  userId: string
  companyId: string
  leadId: string
  leadName: string
  leadEmail: string
  leadPhone?: string | null
  serviceType: string
  address?: string | null
  source: string
  createdAt: string
}) {
  const preferences = await getUserPreferences(data.userId)
  if (!shouldSendNotification(preferences, 'new_leads')) {
    console.log(`Skipping new_leads notification for user ${data.userId} - disabled in preferences`)
    return
  }

  const user = await getUserDetails(data.userId)
  if (!user) return

  const company = await getCompanyDetails(data.companyId)

  const html = newLeadEmailTemplate({
    leadName: data.leadName,
    leadEmail: data.leadEmail,
    leadPhone: data.leadPhone,
    serviceType: data.serviceType,
    address: data.address,
    source: data.source,
    createdAt: data.createdAt,
    leadId: data.leadId,
    companyName: company.name,
    companyColor: company.primary_color,
  })

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`, // TODO: Update domain
    to: user.email,
    subject: `🎯 New Lead: ${data.leadName}`,
    html,
  })

  console.log(`Sent new_leads notification to ${user.email}`)
}

/**
 * Send lead assigned notification
 */
export async function notifyLeadAssigned(data: {
  assignedToUserId: string
  assignedByUserId: string
  companyId: string
  leadId: string
  leadName: string
  serviceType: string
  address?: string | null
}) {
  const preferences = await getUserPreferences(data.assignedToUserId)
  if (!shouldSendNotification(preferences, 'lead_assigned')) {
    console.log(`Skipping lead_assigned notification for user ${data.assignedToUserId}`)
    return
  }

  const [assignedTo, assignedBy, company] = await Promise.all([
    getUserDetails(data.assignedToUserId),
    getUserDetails(data.assignedByUserId),
    getCompanyDetails(data.companyId),
  ])

  if (!assignedTo || !assignedBy) return

  const html = leadAssignedEmailTemplate({
    leadName: data.leadName,
    assignedToName: assignedTo.full_name,
    assignedByName: assignedBy.full_name,
    serviceType: data.serviceType,
    address: data.address,
    leadId: data.leadId,
    companyName: company.name,
    companyColor: company.primary_color,
  })

  // Send email notification
  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
    to: assignedTo.email,
    subject: `📋 Lead Assigned: ${data.leadName}`,
    html,
  })

  // Send push notification
  try {
    // Check if user wants push notifications
    const canSendPush = await shouldSendPushNotification(data.assignedToUserId, 'lead_assigned')
    
    if (canSendPush) {
      await sendPushNotification({
        userIds: [data.assignedToUserId],
        title: '📋 Lead Assigned',
        message: `${assignedBy.full_name} assigned ${data.leadName} to you`,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}`,
        data: {
          type: 'lead_assigned',
          leadId: data.leadId,
          icon: company.logo_url || undefined,
          image: company.logo_url || undefined,
        },
      })
    }
  } catch (error) {
    console.error('Failed to send push notification:', error)
  }

  console.log(`Sent lead_assigned notification to ${assignedTo.email}`)
}

/**
 * Send lead status changed notification
 */
export async function notifyLeadStatusChanged(data: {
  userId: string
  companyId: string
  leadId: string
  leadName: string
  oldStatus: string
  newStatus: string
  changedByUserId: string
  changedAt: string
}) {
  const preferences = await getUserPreferences(data.userId)
  if (!shouldSendNotification(preferences, 'lead_status_change')) {
    console.log(`Skipping lead_status_change notification for user ${data.userId}`)
    return
  }

  const [user, changedBy, company] = await Promise.all([
    getUserDetails(data.userId),
    getUserDetails(data.changedByUserId),
    getCompanyDetails(data.companyId),
  ])

  if (!user || !changedBy) return

  const html = leadStatusChangedEmailTemplate({
    leadName: data.leadName,
    oldStatus: data.oldStatus,
    newStatus: data.newStatus,
    changedByName: changedBy.full_name,
    changedAt: data.changedAt,
    leadId: data.leadId,
    companyName: company.name,
    companyColor: company.primary_color,
  })

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
    to: user.email,
    subject: `🔄 Lead Status Updated: ${data.leadName}`,
    html,
  })

  console.log(`Sent lead_status_change notification to ${user.email}`)
}

/**
 * Send appointment scheduled notification
 */
export async function notifyAppointmentScheduled(data: {
  userId: string
  companyId: string
  leadId: string
  customerName: string
  appointmentType: string
  appointmentDate: string
  appointmentTime: string
  address: string
  assignedToName?: string
  notes?: string | null
  appointmentId: string
}) {
  const preferences = await getUserPreferences(data.userId)
  if (!shouldSendNotification(preferences, 'appointments')) {
    console.log(`Skipping appointments notification for user ${data.userId}`)
    return
  }

  const user = await getUserDetails(data.userId)
  if (!user) return

  const company = await getCompanyDetails(data.companyId)

  const html = appointmentScheduledEmailTemplate({
    customerName: data.customerName,
    appointmentType: data.appointmentType,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    address: data.address,
    assignedToName: data.assignedToName,
    notes: data.notes,
    appointmentId: data.appointmentId,
    leadId: data.leadId,
    companyName: company.name,
    companyColor: company.primary_color,
  })

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
    to: user.email,
    subject: `📅 Appointment Scheduled: ${data.customerName}`,
    html,
  })

  console.log(`Sent appointments notification to ${user.email}`)
}

/**
 * Send appointment reminder (day before)
 */
export async function notifyAppointmentReminder(data: {
  userId: string
  companyId: string
  leadId: string
  customerName: string
  appointmentType: string
  appointmentDate: string
  appointmentTime: string
  address: string
  appointmentId: string
}) {
  const preferences = await getUserPreferences(data.userId)
  if (!shouldSendNotification(preferences, 'appointment_reminders')) {
    console.log(`Skipping appointment_reminders notification for user ${data.userId}`)
    return
  }

  const user = await getUserDetails(data.userId)
  if (!user) return

  const company = await getCompanyDetails(data.companyId)

  const html = appointmentReminderEmailTemplate({
    customerName: data.customerName,
    appointmentType: data.appointmentType,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    address: data.address,
    appointmentId: data.appointmentId,
    leadId: data.leadId,
    companyName: company.name,
    companyColor: company.primary_color,
  })

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
    to: user.email,
    subject: `⏰ Reminder: Appointment Tomorrow with ${data.customerName}`,
    html,
  })

  console.log(`Sent appointment_reminders notification to ${user.email}`)
}

/**
 * Send quote sent notification
 */
export async function notifyQuoteSent(data: {
  userId: string
  companyId: string
  leadId: string
  quoteId: string
  customerName: string
  quoteNumber: string
  totalAmount: number
  sentByUserId: string
  sentAt: string
}) {
  const preferences = await getUserPreferences(data.userId)
  if (!shouldSendNotification(preferences, 'quotes_sent')) {
    console.log(`Skipping quotes_sent notification for user ${data.userId}`)
    return
  }

  const [user, sentBy, company] = await Promise.all([
    getUserDetails(data.userId),
    getUserDetails(data.sentByUserId),
    getCompanyDetails(data.companyId),
  ])

  if (!user || !sentBy) return

  const html = quoteSentNotificationTemplate({
    customerName: data.customerName,
    quoteNumber: data.quoteNumber,
    totalAmount: data.totalAmount,
    sentByName: sentBy.full_name,
    sentAt: data.sentAt,
    quoteId: data.quoteId,
    leadId: data.leadId,
    companyName: company.name,
    companyColor: company.primary_color,
  })

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
    to: user.email,
    subject: `📄 Quote Sent: ${data.customerName} - $${data.totalAmount.toLocaleString()}`,
    html,
  })

  console.log(`Sent quotes_sent notification to ${user.email}`)
}

/**
 * Send quote approved notification
 */
export async function notifyQuoteApproved(data: {
  userIds: string[] // Notify multiple people
  companyId: string
  leadId: string
  quoteId: string
  customerName: string
  quoteNumber: string
  totalAmount: number
  approvedAt: string
}) {
  const company = await getCompanyDetails(data.companyId)

  // Send push notification to all users at once
  try {
    // Filter users who have push notifications enabled
    const usersWithPushEnabled = []
    for (const userId of data.userIds) {
      const canSendPush = await shouldSendPushNotification(userId, 'quotes_approved')
      if (canSendPush) {
        usersWithPushEnabled.push(userId)
      }
    }
    
    if (usersWithPushEnabled.length > 0) {
      await sendPushNotification({
        userIds: usersWithPushEnabled,
        title: '✅ Quote Approved!',
        message: `${data.customerName} approved quote for $${data.totalAmount.toLocaleString()}`,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}`,
        data: {
          type: 'quote_approved',
          quoteId: data.quoteId,
          leadId: data.leadId,
          icon: company.logo_url || undefined,
          image: company.logo_url || undefined,
        },
      })
    }
  } catch (error) {
    console.error('Failed to send push notification:', error)
  }

  for (const userId of data.userIds) {
    const preferences = await getUserPreferences(userId)
    if (!shouldSendNotification(preferences, 'quotes_approved')) {
      console.log(`Skipping quotes_approved notification for user ${userId}`)
      continue
    }

    const user = await getUserDetails(userId)
    if (!user) continue

    const html = quoteApprovedNotificationTemplate({
      customerName: data.customerName,
      quoteNumber: data.quoteNumber,
      totalAmount: data.totalAmount,
      approvedAt: data.approvedAt,
      quoteId: data.quoteId,
      leadId: data.leadId,
      companyName: company.name,
      companyColor: company.primary_color,
    })

    await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
      to: user.email,
      subject: `✅ Quote Approved: ${data.customerName} - $${data.totalAmount.toLocaleString()}!`,
      html,
    })

    console.log(`Sent quotes_approved notification to ${user.email}`)
  }
}

/**
 * Send contract signed notification
 */
export async function notifyContractSigned(data: {
  userIds: string[]
  companyId: string
  leadId: string
  customerName: string
  contractNumber: string
  totalAmount: number
  signedAt: string
}) {
  const company = await getCompanyDetails(data.companyId)

  for (const userId of data.userIds) {
    const preferences = await getUserPreferences(userId)
    if (!shouldSendNotification(preferences, 'contracts_signed')) {
      console.log(`Skipping contracts_signed notification for user ${userId}`)
      continue
    }

    const user = await getUserDetails(userId)
    if (!user) continue

    const html = contractSignedNotificationTemplate({
      customerName: data.customerName,
      contractNumber: data.contractNumber,
      totalAmount: data.totalAmount,
      signedAt: data.signedAt,
      leadId: data.leadId,
      companyName: company.name,
      companyColor: company.primary_color,
    })

    await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
      to: user.email,
      subject: `🎉 Contract Signed: ${data.customerName} - $${data.totalAmount.toLocaleString()}!`,
      html,
    })

    console.log(`Sent contracts_signed notification to ${user.email}`)
  }
}

/**
 * Send payment received notification
 */
export async function notifyPaymentReceived(data: {
  userIds: string[]
  companyId: string
  leadId: string
  customerName: string
  invoiceNumber: string
  amount: number
  paymentMethod: string
  paidAt: string
}) {
  const company = await getCompanyDetails(data.companyId)

  // Send push notification to all users at once
  try {
    // Filter users who have push notifications enabled
    const usersWithPushEnabled = []
    for (const userId of data.userIds) {
      const canSendPush = await shouldSendPushNotification(userId, 'payments_received')
      if (canSendPush) {
        usersWithPushEnabled.push(userId)
      }
    }
    
    if (usersWithPushEnabled.length > 0) {
      await sendPushNotification({
        userIds: usersWithPushEnabled,
        title: '💰 Payment Received',
        message: `${data.customerName} paid $${data.amount.toLocaleString()} via ${data.paymentMethod}`,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}`,
        data: {
          type: 'payment_received',
          leadId: data.leadId,
          invoiceNumber: data.invoiceNumber,
          icon: company.logo_url || undefined,
          image: company.logo_url || undefined,
        },
      })
    }
  } catch (error) {
    console.error('Failed to send push notification:', error)
  }

  for (const userId of data.userIds) {
    const preferences = await getUserPreferences(userId)
    if (!shouldSendNotification(preferences, 'payments_received')) {
      console.log(`Skipping payments_received notification for user ${userId}`)
      continue
    }

    const user = await getUserDetails(userId)
    if (!user) continue

    const html = paymentReceivedNotificationTemplate({
      customerName: data.customerName,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paidAt: data.paidAt,
      leadId: data.leadId,
      companyName: company.name,
      companyColor: company.primary_color,
    })

    await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
      to: user.email,
      subject: `💰 Payment Received: ${data.customerName} - $${data.amount.toLocaleString()}`,
      html,
    })

    console.log(`Sent payments_received notification to ${user.email}`)
  }
}

/**
 * Send daily summary (triggered by cron job)
 */
export async function notifyDailySummary(data: {
  userId: string
  companyId: string
  date: string
  newLeads: number
  appointments: number
  quotesSent: number
  paymentsReceived: number
  totalRevenue: number
  pendingTasks: number
}) {
  const preferences = await getUserPreferences(data.userId)
  if (!shouldSendNotification(preferences, 'daily_summary')) {
    console.log(`Skipping daily_summary notification for user ${data.userId}`)
    return
  }

  const user = await getUserDetails(data.userId)
  if (!user) return

  const company = await getCompanyDetails(data.companyId)

  const html = dailySummaryEmailTemplate({
    userName: user.full_name,
    date: data.date,
    newLeads: data.newLeads,
    appointments: data.appointments,
    quotesSent: data.quotesSent,
    paymentsReceived: data.paymentsReceived,
    totalRevenue: data.totalRevenue,
    pendingTasks: data.pendingTasks,
    companyName: company.name,
    companyColor: company.primary_color,
  })

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
    to: user.email,
    subject: `📊 Your Daily Summary - ${data.date}`,
    html,
  })

  console.log(`Sent daily_summary notification to ${user.email}`)
}
