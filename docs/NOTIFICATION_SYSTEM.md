# Email Notification System

## Overview

The email notification system sends automated notifications to team members based on their individual preferences. Users can control which notifications they receive from their Profile > Notifications page.

## Features

- ✅ **17 Notification Types** organized into 7 categories
- ✅ **User Preferences** - Each user controls their own notification settings
- ✅ **Master Toggles** - Email, Push, and SMS on/off switches
- ✅ **Clean Templates** - Simple, professional emails with direct links
- ✅ **Automatic Checking** - System respects user preferences before sending

## Notification Types

### Lead Management (3)
- `new_leads` - New lead created or assigned
- `lead_assigned` - Lead assigned to you
- `lead_status_change` - Lead status changed

### Appointments (2)
- `appointments` - New appointment scheduled
- `appointment_reminders` - Reminder 1 day before appointment

### Communication (1)
- `messages` - New messages from customers/team

### Tasks (2)
- `tasks` - Task assigned to you
- `task_due_soon` - Task due soon reminder

### Sales (3)
- `quotes_sent` - Quote sent to customer
- `quotes_approved` - Customer approved quote
- `contracts_signed` - Contract digitally signed

### Financial (2)
- `invoices_paid` - Invoice marked as paid
- `payments_received` - Payment recorded

### Projects (2)
- `project_updates` - Project status/milestone changes
- `production_scheduled` - Production scheduled for project

### Reports (2)
- `daily_summary` - Daily activity digest
- `weekly_report` - Weekly performance report

## Usage

### Using Server Actions (Recommended)

Server actions automatically trigger notifications. Use these in your components:

```typescript
import { createLeadAction } from '@/lib/actions/leads'
import { acceptQuoteAction } from '@/lib/actions/quotes'
import { recordPaymentAction } from '@/lib/actions/invoices'

// Create lead with automatic notifications
const result = await createLeadAction(companyId, leadData, currentUserId)

// Accept quote with automatic notifications
const result = await acceptQuoteAction(companyId, quoteId)

// Record payment with automatic notifications
const result = await recordPaymentAction({
  companyId,
  leadId,
  amount: 5000,
  paymentMethod: 'Check',
  paymentDate: new Date().toISOString(),
  createdBy: currentUserId,
})
```

### Manual Notification Calls

For custom scenarios, call notification functions directly (server-side only):

```typescript
import { notifyNewLead } from '@/lib/email/user-notifications'

// Server component or API route
await notifyNewLead({
  userId: assignedUserId,
  companyId,
  leadId,
  leadName: 'John Smith',
  leadEmail: 'john@example.com',
  leadPhone: '555-0100',
  serviceType: 'Roof Replacement',
  address: '123 Main St',
  source: 'Website',
  createdAt: new Date().toISOString(),
})
```

## Available Server Actions

### Lead Actions (`lib/actions/leads.ts`)
- `createLeadAction(companyId, lead, currentUserId)` - Create lead + notify assigned user
- `updateLeadAction(companyId, leadId, updates, currentUserId)` - Update + notify on assignment/status change

### Quote Actions (`lib/actions/quotes.ts`)
- `acceptQuoteAction(companyId, quoteId)` - Accept quote + notify team
- `signContractAction({...})` - Sign contract + notify team

### Invoice Actions (`lib/actions/invoices.ts`)
- `recordPaymentAction({...})` - Record payment + notify team
- `markInvoicePaidAction({...})` - Mark invoice paid + notify team

## Notification Functions

All notification functions in `lib/email/user-notifications.ts`:

```typescript
// Lead notifications
notifyNewLead(data)
notifyLeadAssigned(data)
notifyLeadStatusChanged(data)

// Appointment notifications
notifyAppointmentScheduled(data)
notifyAppointmentReminder(data)

// Quote/Contract notifications
notifyQuoteSent(data)
notifyQuoteApproved(data)
notifyContractSigned(data)

// Payment notifications
notifyPaymentReceived(data)

// Summary notifications
notifyDailySummary(data)
```

## Current Integrations

### ✅ Quote Sent
**Location**: `app/api/quotes/[id]/send-email/route.ts`
- Triggers when quote is emailed to customer
- Notifies assigned user (if different from sender)

### ✅ Lead Created (via Server Action)
**Location**: `lib/actions/leads.ts`
- Triggers when new lead is created
- Notifies assigned user

### ✅ Lead Assigned/Status Changed (via Server Action)
**Location**: `lib/actions/leads.ts`
- Triggers on lead updates
- Notifies assigned user on assignment changes
- Notifies assigned user on status changes

## TODO: Add Notifications To

### High Priority
- [ ] Quote acceptance (customer accepts)
- [ ] Contract signing (digital signature)
- [ ] Payment recording
- [ ] Invoice payment
- [ ] Appointment creation
- [ ] Appointment reminders (cron job needed)

### Medium Priority
- [ ] Task assignment
- [ ] Task due soon reminders (cron job)
- [ ] Project status updates
- [ ] Production scheduling

### Low Priority
- [ ] Daily summary (cron job)
- [ ] Weekly report (cron job)
- [ ] Message notifications

## Email Template Structure

All templates follow this pattern:

```typescript
{
  who: 'Person/team member name',
  what: 'Action that occurred',
  when: 'Timestamp (formatted)',
  where: 'Link to view details',
  details: 'Relevant information in a card',
}
```

Example:
```
🎯 New Lead Received

John Smith
📧 john@example.com
📞 555-0100
📍 123 Main St, Chicago, IL
🔧 Service: Roof Replacement
📥 Source: Website

When: December 16, 2024 at 2:30 PM

[View Lead Details →]
```

## Configuration

### Update Sender Domain

In `lib/email/user-notifications.ts`, update all `from` addresses:

```typescript
from: `${company.name} <notifications@yourdomain.com>`
```

Replace `yourdomain.com` with your verified Resend domain.

### Customize Templates

Templates are in `lib/email/notification-templates.ts`. Each template uses your existing `emailLayout()` helper for consistent branding.

## Testing

1. **Check User Preferences**:
   - Go to Profile > Notifications tab
   - Enable specific notification types
   - Disable master email toggle to stop all emails

2. **Test Notifications**:
   ```typescript
   // In a server component or API route
   await notifyNewLead({
     userId: 'your-user-id',
     companyId: 'your-company-id',
     leadId: 'test-lead-id',
     leadName: 'Test Lead',
     leadEmail: 'test@example.com',
     // ... other fields
   })
   ```

3. **Check Logs**:
   - Console logs show when notifications are sent/skipped
   - Look for: "Sent new_leads notification to user@example.com"
   - Or: "Skipping new_leads notification for user X - disabled in preferences"

## Troubleshooting

### Notifications Not Sending

1. **Check User Preferences**:
   - User may have disabled email_notifications (master toggle)
   - User may have disabled specific notification type

2. **Check Resend Configuration**:
   - Verify RESEND_API_KEY in `.env.local`
   - Verify domain is verified in Resend dashboard
   - Check Resend dashboard for delivery errors

3. **Check Console Logs**:
   - Server logs will show notification attempts
   - Look for "Skipping X notification" messages
   - Check for error messages

### Wrong People Getting Notified

Each notification function specifies who to notify:
- `notifyNewLead` - assigned user
- `notifyLeadAssigned` - newly assigned user
- `notifyQuoteApproved` - assigned user + creator
- `notifyPaymentReceived` - assigned user + creator (except recorder)

Adjust logic in `lib/email/user-notifications.ts` as needed.

## Future Enhancements

- [ ] Push notifications (browser)
- [ ] SMS notifications (Twilio)
- [ ] In-app notification center
- [ ] Notification history/audit log
- [ ] Notification delivery tracking
- [ ] User notification digest (combine multiple into one email)
- [ ] Quiet hours (don't send between 10pm-8am)
- [ ] Notification frequency limits (max per hour/day)
