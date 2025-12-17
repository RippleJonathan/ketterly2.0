# Testing Email Notifications - Checklist

## Before Testing

### 1. Check Your User Email
- [ ] Go to **Profile** (top right menu)
- [ ] Verify your email is a **real email address** you can access
- [ ] If it's a demo email (like `demo@example.com`), update it to your real email

### 2. Check Notification Preferences
- [ ] Go to **Profile → Notifications** tab
- [ ] Verify **"Enable Email Notifications"** is **ON** (master toggle)
- [ ] Verify these specific notifications are enabled:
  - [ ] New leads
  - [ ] Lead assigned
  - [ ] Quotes sent
  - [ ] Quotes approved
  - [ ] Contracts signed
  - [ ] Payments received

### 3. Check Environment Variables
Open your `.env.local` file and verify:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Your actual Resend API key
RESEND_FROM_EMAIL=orders@ketterly.com  # Or your verified sending domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Check Resend Dashboard
- [ ] Log in to https://resend.com/emails
- [ ] Verify your sending domain is verified
- [ ] Check if any emails have been sent/failed

---

## Testing Each Notification

### ✅ Test 1: New Lead Assigned
**How to trigger:**
1. Go to `/admin/leads/new`
2. Fill out the form
3. **In "Assigned To" dropdown, select yourself**
4. Click "Create Lead"

**Expected result:**
- Console should show: `"Sent new_leads notification to your@email.com"`
- You should receive email: "🎯 New Lead Assigned to You"

**If no email:**
- Check browser console for errors
- Check server terminal for notification logs
- Verify your email in database matches your real email

---

### ✅ Test 2: Lead Reassignment
**How to trigger:**
1. Go to any lead detail page
2. Click "Edit" button
3. Change "Assigned To" to yourself (or another user)
4. Click "Save Changes"

**Expected result:**
- Console should show: `"Sent lead_assigned notification to your@email.com"`
- Newly assigned user should receive email: "🎯 New Lead Assigned to You"

---

### ✅ Test 3: Lead Assignment via Dropdown (Leads Table)
**How to trigger:**
1. Go to `/admin/leads` (leads table)
2. Find the "Assigned To" column
3. Click dropdown and select yourself
4. Wait for success toast

**Expected result:**
- Console should show: `"Sent lead_assigned notification to your@email.com"`
- You should receive email: "🎯 New Lead Assigned to You"

---

### ✅ Test 4: Quote Sent to Customer
**How to trigger:**
1. Go to a lead with a quote
2. Open the quote
3. Click "Send to Customer"
4. Enter customer email and send

**Expected result:**
- Console should show: `"Sent quotes_sent notification to assigned@user.com"`
- Assigned user receives email: "📄 Quote Sent to Customer"
- Customer receives quote PDF

---

### ✅ Test 5: Payment Recorded
**How to trigger:**
1. Go to a lead's Payments tab
2. Click "Record Payment"
3. Fill out payment details
4. Submit

**Expected result:**
- Console should show: `"Sent payments_received notification to..."`
- Team members receive email: "💰 Payment Received"

---

### ✅ Test 6: Quote Approved (Customer Signs)
**How to trigger:**
1. Send a quote to a test email you control
2. Open the quote link in the email
3. Click "Sign & Accept Quote"
4. Fill signature and submit

**Expected result:**
- Console should show: `"Sent quotes_approved notification to..."`
- Team receives email: "✅ Quote Approved by Customer"

---

### ✅ Test 7: Contract Fully Signed
**How to trigger:**
1. After customer signs (test 6)
2. Have internal user sign as company rep
3. Both signatures complete

**Expected result:**
- Console should show: `"Sent contracts_signed notification to..."`
- Team receives email: "📝 Contract Fully Signed"
- Customer receives executed contract PDF

---

## Debugging Guide

### No Server Logs Showing?

**Check browser console:**
```
Right-click → Inspect → Console tab
Look for errors or notification messages
```

**Check server terminal:**
```
Should see logs like:
"Sent new_leads notification to user@example.com"
OR
"Skipping new_leads notification for user@example.com - email_notifications disabled"
```

### Email Not Received?

**1. Check Spam/Junk folder**

**2. Verify user preferences in database:**
```sql
SELECT 
  u.email,
  up.email_notifications,
  up.notification_preferences
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
WHERE u.email = 'your@email.com';
```

**3. Check Resend dashboard:**
- Go to https://resend.com/emails
- Look for your email in the list
- Check delivery status (delivered, bounced, failed)

**4. Verify environment variable:**
```bash
# In terminal, check if RESEND_API_KEY is loaded
echo $env:RESEND_API_KEY  # PowerShell
```

### Common Issues

**Issue:** "Missing company or user information"
- **Fix:** Make sure you're logged in and have a company assigned

**Issue:** Console shows "Skipping notification - disabled"
- **Fix:** Go to Profile → Notifications → Enable the notification type

**Issue:** "Invalid API key" error
- **Fix:** Check your `RESEND_API_KEY` in `.env.local`

**Issue:** Emails sending from wrong domain
- **Fix:** Update `RESEND_FROM_EMAIL` in `.env.local`

**Issue:** User email is `demo@example.com`
- **Fix:** Update user email to your real email in Profile

---

## Success Checklist

After testing, you should have received:
- [ ] New lead notification email
- [ ] Lead assignment notification email
- [ ] Quote sent notification email (if tested)
- [ ] Payment received notification email (if tested)
- [ ] Quote approved notification email (if tested)
- [ ] Contract signed notification email (if tested)

---

## Next Steps

Once notifications are working:
1. Test with multiple users
2. Verify deduplication (same person doesn't get multiple emails)
3. Test notification preferences (turn off specific types)
4. Monitor Resend dashboard for delivery rates
5. Adjust notification content if needed

---

**Need help?** Check the server logs in your terminal for detailed error messages!
