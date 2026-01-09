/**
 * Email Notification Templates
 * 
 * Simple, concise templates following the pattern:
 * - Who (person/team member)
 * - What (action that occurred)
 * - When (timestamp)
 * - Where (link to view details)
 */

import { format } from 'date-fns'
import { emailLayout } from './templates'

// =====================================================
// LEAD NOTIFICATIONS
// =====================================================

interface NewLeadEmailData {
  leadName: string
  leadEmail: string
  leadPhone?: string | null
  serviceType: string
  address?: string | null
  source: string
  createdAt: string
  leadId: string
  companyName: string
  companyColor?: string
}

export function newLeadEmailTemplate(data: NewLeadEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      🎯 New Lead Received
    </h2>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">
        ${data.leadName}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        📧 ${data.leadEmail}
      </p>
      ${data.leadPhone ? `
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
          📞 ${data.leadPhone}
        </p>
      ` : ''}
      ${data.address ? `
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
          📍 ${data.address}
        </p>
      ` : ''}
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        🔧 Service: ${data.serviceType}
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        📥 Source: ${data.source}
      </p>
    </div>

    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
      <strong>When:</strong> ${format(new Date(data.createdAt), 'MMMM d, yyyy \'at\' h:mm a')}
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Lead Details →
    </a>
  `

  return emailLayout(content, {
    companyName: data.companyName,
    primaryColor: data.companyColor,
  })
}

interface LeadAssignedEmailData {
  leadName: string
  assignedToName: string
  assignedByName: string
  serviceType: string
  address?: string | null
  leadId: string
  companyName: string
  companyColor?: string
}

export function leadAssignedEmailTemplate(data: LeadAssignedEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      📋 Lead Assigned to You
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      ${data.assignedByName} assigned you a new lead.
    </p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">
        ${data.leadName}
      </p>
      ${data.address ? `
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
          📍 ${data.address}
        </p>
      ` : ''}
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        🔧 Service: ${data.serviceType}
      </p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Lead →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

interface LeadStatusChangedEmailData {
  leadName: string
  oldStatus: string
  newStatus: string
  changedByName: string
  changedAt: string
  leadId: string
  companyName: string
  companyColor?: string
}

export function leadStatusChangedEmailTemplate(data: LeadStatusChangedEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      🔄 Lead Status Updated
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      ${data.changedByName} updated the status for <strong>${data.leadName}</strong>
    </p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        <span style="text-decoration: line-through; opacity: 0.6;">${data.oldStatus}</span>
        →
        <span style="font-weight: 600; color: #059669;">${data.newStatus}</span>
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        ${format(new Date(data.changedAt), 'MMMM d, yyyy \'at\' h:mm a')}
      </p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Lead →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

// =====================================================
// APPOINTMENT NOTIFICATIONS
// =====================================================

interface AppointmentEmailData {
  customerName: string
  appointmentType: string
  appointmentDate: string
  appointmentTime: string
  address: string
  assignedToName?: string
  notes?: string | null
  appointmentId: string
  leadId: string
  companyName: string
  companyColor?: string
}

export function appointmentScheduledEmailTemplate(data: AppointmentEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      📅 Appointment Scheduled
    </h2>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">
        ${data.customerName}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        📍 ${data.address}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        🔧 ${data.appointmentType}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #059669;">
        📅 ${data.appointmentDate} at ${data.appointmentTime}
      </p>
      ${data.assignedToName ? `
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          👤 Assigned to: ${data.assignedToName}
        </p>
      ` : ''}
    </div>

    ${data.notes ? `
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280; font-style: italic;">
        "${data.notes}"
      </p>
    ` : ''}

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Details →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

export function appointmentReminderEmailTemplate(data: AppointmentEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      ⏰ Appointment Reminder
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      You have an upcoming appointment tomorrow.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">
        ${data.customerName}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;">
        📍 ${data.address}
      </p>
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400e;">
        📅 ${data.appointmentDate} at ${data.appointmentTime}
      </p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Details →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

// =====================================================
// QUOTE/CONTRACT NOTIFICATIONS
// =====================================================

interface QuoteSentEmailData {
  customerName: string
  quoteNumber: string
  totalAmount: number
  sentByName: string
  sentAt: string
  quoteId: string
  leadId: string
  companyName: string
  companyColor?: string
}

export function quoteSentNotificationTemplate(data: QuoteSentEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      📄 Quote Sent to Customer
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      ${data.sentByName} sent a quote to ${data.customerName}
    </p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        Quote #${data.quoteNumber}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #059669;">
        $${data.totalAmount.toLocaleString()}
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        ${format(new Date(data.sentAt), 'MMMM d, yyyy \'at\' h:mm a')}
      </p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Lead & Quote →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

interface QuoteApprovedEmailData {
  customerName: string
  quoteNumber: string
  totalAmount: number
  approvedAt: string
  quoteId: string
  leadId: string
  companyName: string
  companyColor?: string
}

export function quoteApprovedNotificationTemplate(data: QuoteApprovedEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      ✅ Quote Approved!
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #059669; font-weight: 600;">
      Great news! ${data.customerName} approved the quote.
    </p>

    <div style="background: #ecfdf5; border-left: 4px solid #059669; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #065f46;">
        Quote #${data.quoteNumber}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #059669;">
        $${data.totalAmount.toLocaleString()}
      </p>
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        Approved: ${format(new Date(data.approvedAt), 'MMMM d, yyyy \'at\' h:mm a')}
      </p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Lead & Quote →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

interface ContractSignedEmailData {
  customerName: string
  contractNumber: string
  totalAmount: number
  signedAt: string
  leadId: string
  companyName: string
  companyColor?: string
}

export function contractSignedNotificationTemplate(data: ContractSignedEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      🎉 Contract Signed!
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #059669; font-weight: 600;">
      ${data.customerName} signed the contract. Time to get to work!
    </p>

    <div style="background: #ecfdf5; border-left: 4px solid #059669; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #065f46;">
        Contract #${data.contractNumber}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #059669;">
        $${data.totalAmount.toLocaleString()}
      </p>
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        Signed: ${format(new Date(data.signedAt), 'MMMM d, yyyy \'at\' h:mm a')}
      </p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Project Details →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

// =====================================================
// PAYMENT NOTIFICATIONS
// =====================================================

interface PaymentEmailData {
  customerName: string
  invoiceNumber: string
  amount: number
  paymentMethod: string
  paidAt: string
  leadId: string
  companyName: string
  companyColor?: string
}

export function paymentReceivedNotificationTemplate(data: PaymentEmailData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      💰 Payment Received
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      Payment received from ${data.customerName}
    </p>

    <div style="background: #ecfdf5; border-left: 4px solid #059669; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #065f46;">
        Invoice #${data.invoiceNumber}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #059669;">
        $${data.amount.toLocaleString()}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #065f46;">
        Method: ${data.paymentMethod}
      </p>
      <p style="margin: 0; font-size: 14px; color: #065f46;">
        ${format(new Date(data.paidAt), 'MMMM d, yyyy \'at\' h:mm a')}
      </p>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.leadId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Details →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

// =====================================================
// DAILY/WEEKLY SUMMARY
// =====================================================

interface DailySummaryData {
  userName: string
  date: string
  newLeads: number
  appointments: number
  quotesSent: number
  paymentsReceived: number
  totalRevenue: number
  pendingTasks: number
  companyName: string
  companyColor?: string
}

export function dailySummaryEmailTemplate(data: DailySummaryData): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      📊 Daily Summary for ${data.date}
    </h2>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
      Hi ${data.userName}, here's your activity summary for today.
    </p>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">New Leads</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">${data.newLeads}</p>
      </div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Appointments</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">${data.appointments}</p>
      </div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Quotes Sent</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">${data.quotesSent}</p>
      </div>
      <div style="background: #ecfdf5; border-radius: 8px; padding: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #065f46; text-transform: uppercase;">Revenue</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #059669;">$${data.totalRevenue.toLocaleString()}</p>
      </div>
    </div>

    ${data.pendingTasks > 0 ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          ⚠️ You have <strong>${data.pendingTasks} pending tasks</strong> that need attention.
        </p>
      </div>
    ` : ''}

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
      View Dashboard →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}

// =====================================================
// CALENDAR EVENT NOTIFICATIONS
// =====================================================

interface AppointmentConfirmationEmailData {
  customerName: string
  customerEmail: string
  eventType: string
  eventTitle: string
  eventDate: string
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  meetingUrl?: string | null
  assignedUserName: string
  companyName: string
  companyColor?: string
  eventId: string
}

export function appointmentConfirmationEmailTemplate(data: AppointmentConfirmationEmailData): string {
  const eventDateTime = data.startTime 
    ? `${format(new Date(data.eventDate), 'EEEE, MMMM d, yyyy')} at ${data.startTime}${data.endTime ? ` - ${data.endTime}` : ''}`
    : format(new Date(data.eventDate), 'EEEE, MMMM d, yyyy')

  const content = `
    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #111827;">
      📅 Appointment Confirmed
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
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        👤 Assigned to: ${data.assignedUserName}
      </p>
      ${data.meetingUrl ? `
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
          🔗 <a href="${data.meetingUrl}" style="color: #3b82f6;">Join Meeting</a>
        </p>
      ` : ''}
    </div>

    <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
      Hi ${data.customerName},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
      Your ${data.eventType.toLowerCase()} appointment has been scheduled. We're looking forward to working with you!
    </p>

    <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
      If you need to reschedule or have any questions, please don't hesitate to contact us.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/appointment/${data.eventId}" 
       style="display: inline-block; background: ${data.companyColor || '#1e40af'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px;">
      View Appointment Details →
    </a>
  `

  return emailLayout(content, { companyName: data.companyName, primaryColor: data.companyColor })
}
