# Notification System Integration - Status

## ✅ Completed Integrations

### 1. Quick Add Lead Button
**File**: `components/admin/quick-add-lead-button.tsx`
**Status**: ✅ INTEGRATED
**Triggers**: 
- `new_leads` notification when lead is created and assigned to someone

**Changes Made**:
- Replaced `useCreateLead()` hook with `createLeadAction()` server action
- Automatically sends notification to assigned user
- Added proper error handling and loading states

---

### 2. Quote Sent to Customer  
**File**: `app/api/quotes/[id]/send-email/route.ts`
**Status**: ✅ INTEGRATED
**Triggers**:
- `quotes_sent` notification to assigned team member when quote is emailed

**Changes Made**:
- Added `notifyQuoteSent()` call after email is sent
- Notifies assigned user (if different from sender)

---

### 3. Payment Recording
**File**: `components/admin/leads/record-payment-dialog.tsx`
**Status**: ✅ INTEGRATED
**Triggers**:
- `payments_received` notification to assigned user and lead creator

**Changes Made**:
- Replaced standard payment creation with `recordPaymentAction()` server action
- Automatically notifies team members when payment is recorded
- Added proper query invalidation for UI updates

---

### 4. Quote Acceptance (Customer Signs)
**File**: `app/api/quotes/sign-pdf/route.ts`
**Status**: ✅ INTEGRATED
**Triggers**:
- `quotes_approved` notification when customer signs quote

**Changes Made**:
- Added `notifyQuoteApproved()` call after customer signature
- Notifies assigned user and lead creator
- Triggers automatically when customer submits signature on public quote page

---

### 5. Contract Signing (Both Signatures Complete)
**File**: `app/api/quotes/sign-pdf/route.ts`
**Status**: ✅ INTEGRATED
**Triggers**:
- `contracts_signed` notification when both customer and company rep have signed

**Changes Made**:
- Added `notifyContractSigned()` call when both signatures detected
- Notifies assigned user and lead creator
- Sends executed contract email to customer + team notifications

---

### 6. Lead Assignment Changes
**File**: `components/admin/leads/assign-user-dropdown.tsx`
**Status**: ✅ INTEGRATED
**Triggers**:
- `lead_assigned` notification when user is assigned or reassigned to a lead

**Changes Made**:
- Replaced direct `updateLead()` with `updateLeadAction()` server action
- Automatically detects assignment changes and notifies newly assigned user
- Works in leads table and lead detail page

---

## ⏳ Pending Integrations (Optional)

### 7. Lead Status Changes
**Files Needed**:
- Lead status update dropdowns
- Lead kanban board (if exists)

**Notification**: `lead_status_change`
**Priority**: LOW - Skip for now
**Action Required**:
- Replace direct lead updates with `updateLeadAction()`
- Automatically detects status changes

---

### 8. Invoice Marked as Paid
**Files Needed**:
- Invoice management page
- Wherever invoices can be marked as paid

**Notification**: `invoices_paid`
**Priority**: LOW - Skip for now
**Action Required**:
- Use `markInvoicePaidAction()` when marking invoices as paid

---

### 9. Appointment Scheduling
**Files Needed**:
- Appointment creation forms
- Calendar integration

**Notifications**: 
- `appointments` - When appointment is scheduled
- `appointment_reminders` - Day before (needs cron job)

**Action Required**:
- Create appointment notification function
- Call after appointment is created

**Code to Add**:
```typescript
import { notifyAppointmentScheduled } from '@/lib/email/user-notifications'

await notifyAppointmentScheduled({
  userId: assignedUserId,
  companyId,
  leadId,
  customerName,
  appointmentType: 'Inspection',
  appointmentDate: 'December 17, 2024',
  appointmentTime: '2:00 PM',
  address,
  appointmentId,
})
```

---

### 10. Future: Cron Jobs Needed

These require scheduled tasks (not yet implemented):

#### Daily Summary
**Schedule**: Every day at 6:00 PM
**Function**: `notifyDailySummary()`
**Code**:
```typescript
// Supabase Edge Function or Vercel Cron
export async function dailySummaryJob() {
  // Get all users who want daily summaries
  const users = await getUsersWithPreference('daily_summary')
  
  for (const user of users) {
    const stats = await getDailyStats(user.id)
    await notifyDailySummary({
      userId: user.id,
      companyId: user.company_id,
      date: today,
      ...stats
    })
  }
}
```

#### Appointment Reminders
**Schedule**: Every day at 8:00 AM
**Function**: `notifyAppointmentReminder()`
**Code**:
```typescript
// Get appointments scheduled for tomorrow
const tomorrow = await getAppointmentsTomorrow()

for (const appt of tomorrow) {
  await notifyAppointmentReminder({
    userId: appt.assigned_to,
    // ... appointment details
  })
}
```

---

## 📊 Integration Checklist

### Core Workflow Notifications (6/6 Complete) ✅
- [x] Quick Add Lead (new_leads)
- [x] Quote Sent to Customer (quotes_sent)
- [x] Payment Recorded (payments_received)
- [x] Quote Acceptance (quotes_approved)
- [x] Contract Signing (contracts_signed)
- [x] Lead Assignment (lead_assigned)

### Optional/Future Notifications
- [ ] Lead Status Change (lead_status_change) - SKIPPED
- [ ] Invoice Paid (invoices_paid) - SKIPPED
- [ ] Appointment Scheduled (appointments) - Not yet implemented
- [ ] Task Assignment (tasks) - Not yet implemented
- [ ] Project Updates (project_updates) - Not yet implemented
- [ ] Production Scheduled (production_scheduled) - Not yet implemented
- [ ] Messages (messages) - Not yet implemented

### Scheduled/Cron Job Notifications
- [ ] Appointment Reminders (appointment_reminders) - Needs cron job
- [ ] Task Due Soon (task_due_soon) - Needs cron job
- [ ] Daily Summary (daily_summary) - Needs cron job
- [ ] Weekly Report (weekly_report) - Needs cron job

---

## 🔍 How to Find Integration Points

### Finding Lead Edit Forms
```bash
# Search for lead update functions
grep -r "updateLead" components/
grep -r "assigned_to" components/
grep -r "lead status" components/
```

### Finding Quote Acceptance
```bash
# Search for quote acceptance
grep -r "acceptQuote" components/
grep -r "Sign & Accept" app/
grep -r "signature" components/
```

### Finding Invoice Management
```bash
# Search for invoice operations
grep -r "mark.*paid" components/
grep -r "invoice.*paid" components/
grep -r "updateInvoice" components/
```

---

## 🛠️ Testing Notifications

### Test Lead Notifications
1. Go to dashboard
2. Click "Add Lead" button (header or FAB)
3. Fill out form, assign to yourself
4. Submit
5. Check email for "🎯 New Lead" notification

### Test Payment Notifications
1. Go to a lead's Payments tab
2. Click "Record Payment"
3. Enter payment details
4. Submit
5. Check email for "💰 Payment Received" notification

### Test Quote Notifications
1. Go to a lead's Estimates tab
2. Send a quote to customer
3. Check email for "📄 Quote Sent to Customer" notification

---

## 🐛 Troubleshooting

### No Emails Received?

1. **Check User Preferences**:
   - Go to Profile > Notifications
   - Verify email_notifications is ON
   - Verify specific notification type is enabled

2. **Check Console Logs**:
   - Look for "Sent X notification to user@example.com"
   - Or "Skipping X notification for user Y - disabled"

3. **Check Resend Dashboard**:
   - Go to https://resend.com/emails
   - Check delivery status
   - Look for bounces/errors

4. **Check Environment Variable**:
   - Verify `RESEND_FROM_EMAIL` is set in `.env.local`
   - Should be a verified domain in Resend

### Notifications Sent to Wrong People?

Check the logic in `lib/email/user-notifications.ts`:
- `notifyNewLead` → assigned user only
- `notifyQuoteApproved` → assigned user + lead creator
- `notifyPaymentReceived` → assigned user + lead creator (except person who recorded it)

Adjust the `userIdsToNotify` logic as needed.

---

## 📝 Next Steps

1. **Find & Integrate Quote Acceptance** - Most important for customer flow
2. **Add Lead Assignment Notifications** - Important for team coordination
3. **Set Up Appointment Notifications** - Good for operations
4. **Plan Cron Jobs** - Daily summaries and reminders

Would you like help finding and integrating any of these specific components?
