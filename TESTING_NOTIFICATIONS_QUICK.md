# Quick Notification Testing Guide

## ✅ Test 1: New Lead Assigned - WORKING!
**Status**: ✅ Confirmed working
**Email sent to**: jonathan@rippleroofs.com
**Notification ID**: d9230e52-8be7-4e98-8a84-b8268f2892ae

---

## 🧪 Test 2: Lead Reassignment

**How to test**:
1. Go to `/admin/leads`
2. Find any lead in the table
3. Click the "Assigned To" dropdown
4. Select a **different user** (not yourself)
5. Watch terminal for logs

**Expected terminal output**:
```
[UPDATE LEAD ACTION] Called with assignment change
[UPDATE LEAD ACTION] Lead updated successfully
[UPDATE LEAD ACTION] Sending lead_assigned notification to: <user-id>
Email sent successfully: <email-id>
Sent lead_assigned notification to user@email.com
```

**Expected email**:
- Subject: "🎯 New Lead Assigned to You"
- Content: Lead details with link to lead page

---

## 🧪 Test 3: Quote Sent to Customer

**How to test**:
1. Go to any lead detail page
2. Go to **Estimates** tab
3. Create a quote (or use existing)
4. Click **"Send to Customer"**
5. Enter customer email
6. Click Send
7. Watch terminal for logs

**Expected terminal output**:
```
[QUOTE SEND] Quote sent to customer successfully
Sent quotes_sent notification to <assigned-user>
```

**Expected email** (to assigned team member):
- Subject: "📄 Quote Sent to Customer"
- Content: Quote details with link

---

## 🧪 Test 4: Payment Recorded

**How to test**:
1. Go to any lead with an invoice
2. Go to **Payments** tab
3. Click **"Record Payment"**
4. Fill out payment details:
   - Amount
   - Payment method
   - Date
   - Notes (optional)
5. Click **Submit**
6. Watch terminal for logs

**Expected terminal output**:
```
[PAYMENT RECORDED] Payment recorded successfully
Sent payments_received notification to <assigned-user>
Sent payments_received notification to <creator-user>
```

**Expected email** (to assigned user AND lead creator):
- Subject: "💰 Payment Received"
- Content: Payment details with link to lead

---

## 🧪 Test 5: Quote Approved (Customer Signs)

**How to test**:
1. Send a quote to a test email you control
2. Open the quote link in the email
3. On the public quote page, click **"Sign & Accept Quote"**
4. Fill out:
   - Your name
   - Your email
   - Draw signature
   - Check "I accept terms"
5. Click **"Submit Signature"**
6. Watch terminal for logs

**Expected terminal output**:
```
[DUAL SIGNATURE] Customer signed quote
Sent quotes_approved notification to <assigned-user>
Sent quotes_approved notification to <creator-user>
```

**Expected email** (to team):
- Subject: "✅ Quote Approved by Customer"
- Content: Quote details with customer info

---

## 🧪 Test 6: Contract Fully Signed (Both Signatures)

**How to test**:
1. After customer signs (Test 5)
2. Have an internal user sign as company rep
3. When both signatures complete
4. Watch terminal for logs

**Expected terminal output**:
```
[DUAL SIGNATURE] Both signatures complete - sending executed contract email
[DUAL SIGNATURE] ✅ Executed contract email sent successfully
Sent contracts_signed notification to <assigned-user>
Sent contracts_signed notification to <creator-user>
```

**Expected emails**:
1. **To customer**: Executed contract PDF
2. **To team**: "📝 Contract Fully Signed" notification

---

## 📊 Testing Checklist

- [x] New Lead Assigned ✅
- [ ] Lead Reassignment
- [ ] Quote Sent to Customer
- [ ] Payment Recorded
- [ ] Quote Approved (Customer Signs)
- [ ] Contract Fully Signed

---

## 🔍 What to Look For

### In Terminal (Server Logs)
Every successful notification should show:
```
Email sent successfully: <resend-email-id>
Sent <notification_type> notification to <user-email>
```

### In Email Inbox
- **From**: orders@ketterly.com (or your RESEND_FROM_EMAIL)
- **Subject**: Emoji + notification type
- **Content**: 
  - Who/What/When/Where format
  - Direct link to CRM
  - Company branding (logo if configured)

### In Resend Dashboard
- Go to https://resend.com/emails
- Check delivery status
- Verify all emails show as "Delivered"

---

## 🐛 Troubleshooting

### No Email Received?

1. **Check terminal** - Did it say "Sent X notification"?
2. **Check spam folder** - Sometimes goes to spam first time
3. **Check Resend dashboard** - See delivery status
4. **Check user preferences**:
   - Go to Profile → Notifications
   - Verify email_notifications is ON
   - Verify specific notification type is enabled

### Email to Wrong Person?

Check the notification logic:
- **New Lead**: Only assigned user (if different from creator)
- **Reassignment**: Only newly assigned user
- **Quote Sent**: Only assigned user (if different from sender)
- **Payment**: Assigned user + lead creator (excluding recorder)
- **Quote Approved**: Assigned user + lead creator
- **Contract Signed**: Assigned user + lead creator

---

## 🎯 Quick Test All

To quickly test all notification types:

1. **Create a lead** assigned to another user → Check email ✅
2. **Reassign that lead** to yourself → Check email
3. **Create a quote** and send it → Check email
4. **Record a payment** → Check email
5. **Use public quote link** to accept → Check email
6. **Sign as company rep** → Check email

All done! 🎉

---

**Need help with any test?** Just run through each one and watch the terminal logs!
