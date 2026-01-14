# Push Notification System - Current Implementation & Roadmap

## ✅ Currently Implemented Push Notifications

### 1. **Lead Assigned** 
- **Trigger**: When a lead is assigned to a user
- **Message**: "[Assigner Name] assigned [Lead Name] to you"
- **Link**: Opens specific lead detail page
- **Icon**: Company logo
- **User Preference**: `lead_assigned`

### 2. **Quote Approved**
- **Trigger**: When a quote is approved/accepted by customer
- **Message**: "Quote approved for [Lead Name] - $[Amount]"
- **Link**: Opens lead detail page
- **Icon**: Company logo
- **User Preference**: `quotes_approved`

### 3. **Payment Received**
- **Trigger**: When a payment is recorded for an invoice
- **Message**: "Payment received for [Lead Name] - $[Amount]"
- **Link**: Opens lead detail page
- **Icon**: Company logo
- **User Preference**: `payments_received`

### 4. **Commission Approved**
- **Trigger**: When admin approves a commission
- **Message**: "Your commission for [Lead Name] has been approved ($[Amount])"
- **Link**: Opens lead page, commissions tab
- **User Preference**: `commission_approved`

### 5. **Test Notification**
- **Trigger**: User clicks "Send Test Notification" in profile
- **Message**: "If you can see this, push notifications are working perfectly!"
- **Link**: Opens admin dashboard
- **Used For**: Testing that notifications work

---

## 🎯 Easy to Add (High Priority)

### Lead Activity Notifications

**1. New Note Added to Lead**
```typescript
notifyNewNote({
  userId: lead.assigned_to,
  leadName: lead.full_name,
  noteAuthor: user.full_name,
  notePreview: note.content.substring(0, 50) + '...'
})
// "John added a note to ABC Roofing: 'Customer wants...'"
```

**2. Lead Status Changed**
```typescript
notifyLeadStatusChanged({
  userId: lead.assigned_to,
  leadName: lead.full_name,
  oldStatus: 'new',
  newStatus: 'qualified',
  changedBy: user.full_name
})
// "John changed ABC Roofing status to Qualified"
```

**3. New Lead Created** (for managers/admins)
```typescript
notifyNewLead({
  userId: manager.id,
  leadName: lead.full_name,
  serviceType: lead.service_type,
  source: lead.source
})
// "New lead: ABC Roofing - Roof Replacement (Website)"
```

### Job/Project Notifications

**4. Job Scheduled**
```typescript
notifyJobScheduled({
  userId: crew.assigned_to,
  leadName: lead.full_name,
  jobDate: schedule.start_time,
  jobType: schedule.type
})
// "Job scheduled for ABC Roofing on Jan 15 - Inspection"
```

**5. Job Starting Soon** (24hr reminder)
```typescript
notifyJobReminder({
  userId: crew.assigned_to,
  leadName: lead.full_name,
  jobDate: schedule.start_time,
  address: lead.address
})
// "Reminder: Job at ABC Roofing tomorrow at 9:00 AM"
```

**6. Job Completed**
```typescript
notifyJobCompleted({
  userId: lead.assigned_to, // sales rep
  leadName: lead.full_name,
  completedBy: crew.full_name
})
// "Job completed at ABC Roofing by Crew A"
```

### Quote & Contract Notifications

**7. Quote Sent to Customer**
```typescript
notifyQuoteSent({
  userId: lead.assigned_to,
  leadName: lead.full_name,
  quoteAmount: quote.total_price
})
// "Quote sent to ABC Roofing - $15,250"
```

**8. Contract Signed**
```typescript
notifyContractSigned({
  userId: lead.assigned_to,
  leadName: lead.full_name,
  contractAmount: quote.total_price
})
// "Contract signed for ABC Roofing - $15,250"
```

**9. Change Order Approved**
```typescript
notifyChangeOrderApproved({
  userId: lead.assigned_to,
  leadName: lead.full_name,
  changeOrderAmount: change_order.total_change
})
// "Change order approved for ABC Roofing - +$2,500"
```

### Invoice Notifications

**10. Invoice Sent**
```typescript
notifyInvoiceSent({
  userId: lead.assigned_to,
  leadName: lead.full_name,
  invoiceNumber: invoice.invoice_number,
  amount: invoice.total_amount
})
// "Invoice #1234 sent to ABC Roofing - $15,250"
```

**11. Payment Overdue**
```typescript
notifyPaymentOverdue({
  userId: lead.assigned_to,
  leadName: lead.full_name,
  invoiceNumber: invoice.invoice_number,
  daysOverdue: 7
})
// "Payment overdue: ABC Roofing Invoice #1234 (7 days)"
```

---

## 🚀 Advanced Features (Future)

### Team Collaboration

**12. Tagged in Note/Comment**
```typescript
// "@JohnDoe needs to follow up on this"
// "You were tagged in a note on ABC Roofing"
```

**13. Lead Transfer**
```typescript
// "ABC Roofing was transferred from John to you"
```

**14. Team Mention**
```typescript
// "@SalesTeam check out this hot lead"
```

### Performance Notifications

**15. Commission Earned** (automatic on payment)
```typescript
// "You earned $450 commission from ABC Roofing payment"
```

**16. Monthly Commission Summary**
```typescript
// "Your commissions this month: $3,250 (5 jobs)"
```

**17. Sales Goal Progress**
```typescript
// "You're 80% to your monthly goal! ($40k / $50k)"
```

### Customer Activity

**18. Customer Reply**
```typescript
// "ABC Roofing replied to your quote"
```

**19. Document Viewed**
```typescript
// "ABC Roofing viewed your quote"
```

**20. Review/Feedback Left**
```typescript
// "ABC Roofing left a 5-star review!"
```

### System Alerts

**21. Low Material Inventory** (for managers)
```typescript
// "Alert: IKO Shingles inventory low (5 bundles)"
```

**22. Crew Availability Change**
```typescript
// "Crew member called out sick for tomorrow's jobs"
```

**23. Weather Alert**
```typescript
// "Weather alert: Rain forecasted for scheduled jobs tomorrow"
```

---

## 🎛️ User Control

All notifications respect user preferences:

### Current Preference Categories:
- `lead_assigned` - Lead assignments
- `quotes_approved` - Quote approvals  
- `payments_received` - Payment notifications
- `commission_approved` - Commission approvals
- `new_leads` - New lead notifications (email only currently)

### Master Toggles:
- **Push Notifications**: ON/OFF for all push notifications
- **Email Notifications**: ON/OFF for all email notifications
- **SMS Notifications**: ON/OFF for all SMS (future feature)

### Individual Controls:
Users can turn on/off each notification type independently in their profile settings.

---

## 💡 Recommended Next Steps

**Phase 1 (Quick Wins):**
1. ✅ Lead Assigned (Done)
2. ✅ Quote Approved (Done)
3. ✅ Payment Received (Done)
4. **New Note Added** - Easy, high value
5. **Lead Status Changed** - Easy, keeps team informed
6. **Job Scheduled** - Important for crew coordination

**Phase 2 (Enhanced Workflow):**
7. Job Reminders (24hr before)
8. Quote Sent notification
9. Contract Signed notification
10. Invoice Sent notification

**Phase 3 (Advanced):**
11. Payment overdue alerts
12. Commission earned (auto on payment)
13. Team mentions/tags
14. Performance tracking notifications

---

## 🔧 Implementation Notes

**To add a new notification type:**

1. Add notification function in `lib/email/user-notifications.ts`:
```typescript
export async function notifyNewNote(data: {
  userId: string
  leadName: string
  noteAuthor: string
  notePreview: string
  leadId: string
  companyId: string
}) {
  const canSendPush = await shouldSendPushNotification(userId, 'new_note')
  
  if (canSendPush) {
    await sendPushNotification({
      userIds: [data.userId],
      title: '💬 New Note',
      message: `${data.noteAuthor} added a note to ${data.leadName}`,
      url: `/admin/leads/${data.leadId}`,
      data: {
        type: 'new_note',
        leadId: data.leadId,
      },
    })
  }
}
```

2. Call it where the action happens (e.g., when note is created)

3. Add preference key to user settings UI

That's it! The infrastructure is all in place.
