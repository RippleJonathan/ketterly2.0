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
import { format } from 'date-fns'

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
  userId: string
  companyId: string
  leadId: string
  customerName: string
  contractNumber: string
  totalAmount: number
  signedAt: string
}) {
  const company = await getCompanyDetails(data.companyId)

  const userId = data.userId
  const preferences = await getUserPreferences(userId)
  if (!shouldSendNotification(preferences, 'contracts_signed')) {
    console.log(`Skipping contracts_signed notification for user ${userId}`)
    return
  }

  const user = await getUserDetails(userId)
  if (!user) return

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

/**
 * Send appointment assigned notification
 */
export async function notifyAppointmentAssigned(data: {
  assignedUserId: string
  eventId: string
  eventTitle: string
  eventDate: string
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  leadName?: string | null
  companyId: string
}) {
  const preferences = await getUserPreferences(data.assignedUserId)
  if (!shouldSendNotification(preferences, 'appointment_assigned')) {
    console.log(`Skipping appointment_assigned notification for user ${data.assignedUserId}`)
    return
  }

  const user = await getUserDetails(data.assignedUserId)
  if (!user) return

  const company = await getCompanyDetails(data.companyId)

  const eventDateTime = data.startTime 
    ? `${format(new Date(data.eventDate), 'EEEE, MMMM d, yyyy')} at ${data.startTime}${data.endTime ? ` - ${data.endTime}` : ''}`
    : format(new Date(data.eventDate), 'EEEE, MMMM d, yyyy')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${company.name} - Appointment Assigned</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid ${company.primary_color || '#1e40af'}; margin-bottom: 30px;">
    <h1 style="color: ${company.primary_color || '#1e40af'}; margin: 0;">${company.name}</h1>
  </div>
  
  <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
    📅 Appointment Assigned
  </h2>
  
  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
    <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">
      ${data.eventTitle}
    </p>
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
      📅 ${eventDateTime}
    </p>
    ${data.location ? `
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        📍 ${data.location}
      </p>
    ` : ''}
    ${data.leadName ? `
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        👤 Customer: ${data.leadName}
      </p>
    ` : ''}
  </div>

  <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
    Hi ${user.full_name},
  </p>
  
  <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
    You have been assigned to an upcoming appointment. Please review the details and prepare accordingly.
  </p>

  <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/calendar" 
     style="display: inline-block; background: ${company.primary_color || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
    View in Calendar →
  </a>
</body>
</html>`

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
    to: user.email,
    subject: `📅 Appointment Assigned: ${data.eventTitle}`,
    html,
  })

  console.log(`Sent appointment_assigned notification to ${user.email}`)
}

/**
 * Send new note added notification
 */
export async function notifyNewNote(data: {
  userId: string
  companyId: string
  leadId: string
  leadName: string
  noteAuthor: string
  noteAuthorId: string
  noteContent: string
}) {
  // Check if user wants push notifications for notes
  const canSendPush = await shouldSendPushNotification(data.userId, 'new_note')
  
  if (!canSendPush) {
    console.log(`Skipping new_note notification for user ${data.userId}`)
    return
  }

  // Don't notify user of their own notes
  if (data.userId === data.noteAuthorId) {
    return
  }

  const company = await getCompanyDetails(data.companyId)
  const notePreview = data.noteContent.length > 50 
    ? data.noteContent.substring(0, 50) + '...'
    : data.noteContent

  try {
    await sendPushNotification({
      userIds: [data.userId],
      title: '💬 New Note',
      message: `${data.noteAuthor} added a note to ${data.leadName}: "${notePreview}"`,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}`,
      data: {
        type: 'new_note',
        leadId: data.leadId,
        icon: company.logo_url || undefined,
      },
    })
    console.log(`Sent new_note push notification to user ${data.userId}`)
  } catch (error) {
    console.error('Failed to send new_note push notification:', error)
  }
}

/**
 * Send new lead created notification (for managers/admins)
 */
export async function notifyNewLeadCreated(data: {
  userIds: string[]  // List of managers/admins to notify
  companyId: string
  leadId: string
  leadName: string
  leadEmail: string
  leadPhone?: string | null
  serviceType: string
  source: string
  address?: string | null
}) {
  const company = await getCompanyDetails(data.companyId)

  for (const userId of data.userIds) {
    // Check if user wants push notifications for new leads
    const canSendPush = await shouldSendPushNotification(userId, 'new_leads')
    
    if (!canSendPush) {
      console.log(`Skipping new_leads notification for user ${userId}`)
      continue
    }

    try {
      await sendPushNotification({
        userIds: [userId],
        title: '🎯 New Lead',
        message: `${data.leadName} - ${data.serviceType} (${data.source})`,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}`,
        data: {
          type: 'new_lead',
          leadId: data.leadId,
          icon: company.logo_url || undefined,
        },
      })
      console.log(`Sent new_leads push notification to user ${userId}`)
    } catch (error) {
      console.error('Failed to send new_leads push notification:', error)
    }
  }
}

/**
 * Send job scheduled notification
 */
export async function notifyJobScheduled(data: {
  userId: string  // Crew member or assignee
  companyId: string
  eventId: string
  leadId?: string | null
  leadName?: string | null
  jobDate: string  // ISO date string
  jobType: string  // e.g., "Inspection", "Installation"
  address?: string | null
}) {
  // Check if user wants push notifications for job schedules
  const canSendPush = await shouldSendPushNotification(data.userId, 'job_scheduled')
  
  if (!canSendPush) {
    console.log(`Skipping job_scheduled notification for user ${data.userId}`)
    return
  }

  const company = await getCompanyDetails(data.companyId)
  const jobDateFormatted = format(new Date(data.jobDate), 'MMM d, yyyy h:mm a')
  const customerInfo = data.leadName ? ` for ${data.leadName}` : ''

  try {
    await sendPushNotification({
      userIds: [data.userId],
      title: '📅 Job Scheduled',
      message: `${data.jobType}${customerInfo} on ${jobDateFormatted}`,
      url: data.leadId 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/admin/calendar`,
      data: {
        type: 'job_scheduled',
        eventId: data.eventId,
        leadId: data.leadId || undefined,
        icon: company.logo_url || undefined,
      },
    })
    console.log(`Sent job_scheduled push notification to user ${data.userId}`)
  } catch (error) {
    console.error('Failed to send job_scheduled push notification:', error)
  }
}
