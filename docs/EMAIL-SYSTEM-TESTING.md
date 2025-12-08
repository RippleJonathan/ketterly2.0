# Email System Implementation - Testing Guide

## ✅ Step 3: Email Integration Complete

### What Was Implemented

**1. Database Migration** (`20241205000009_add_email_tracking.sql`)
   - New table: `material_order_emails` to track all sent emails
   - Fields: order_id, supplier_id, recipient_email, subject, status, sent_at
   - Email statuses: sending, sent, failed, bounced
   - Added to `material_orders`: last_emailed_at, email_count

**2. Email API Route** (`/api/material-orders/send-email`)
   - Integrates with Resend for email delivery
   - Generates PDF and attaches to email
   - Professional HTML email template
   - Tracks email status in database
   - Updates order email count

**3. UI Components**
   - "Email PO" button on Material Order Cards
   - "Email PO" button in Material Order Detail Dialog
   - Email History section shows all sent emails with status badges
   - Buttons auto-disable if no supplier email exists
   - Loading states during email sending

### Testing Steps

**Before Testing:**

1. **Run the database migration:**
   - Copy the SQL from `supabase/migrations/20241205000009_add_email_tracking.sql`
   - Paste into Supabase Dashboard → SQL Editor
   - Click "Run"

2. **Verify Resend API Key:**
   - Check `.env.local` has: `RESEND_API_KEY=re_...`
   - Check `.env.local` has: `RESEND_FROM_EMAIL=orders@yourdomain.com` (or use default)
   - Make sure your domain is verified in Resend dashboard

3. **Add supplier email:**
   - Go to Settings → Suppliers
   - Add or edit a supplier
   - Make sure they have an email address

**Test Flow:**

1. **Create a material order with supplier:**
   - Navigate to a lead
   - Go to Orders tab
   - Click "Create Order"
   - Select template
   - **Select a supplier with an email**
   - Complete order creation

2. **Send email from card:**
   - Find the order in the list
   - Click "Email PO" button
   - Should show "Sending..." then success toast
   - Button becomes enabled again

3. **View email history:**
   - Click "View Details" on the order
   - See "Email History" section at top
   - Should show sent email with timestamp and status badge

4. **Send email from detail dialog:**
   - With detail dialog open
   - Click "Email PO" button in header
   - Verify success toast
   - Email history updates automatically

5. **Check received email:**
   - Check the supplier's inbox
   - Email should include:
     * Professional HTML template
     * Order details (PO number, dates, total)
     * Attached PDF purchase order
     * Company contact information

### Email Template Features

- **Subject**: `Purchase Order {order_number} from {company_name}`
- **Professional HTML design** with company branding
- **Order summary** with key details
- **PDF attachment** with complete purchase order
- **Company contact info** in footer
- **Responsive** email design

### Error Handling

The system handles:
- ✅ Missing supplier email (shows error toast)
- ✅ Email send failures (marked as 'failed' in database)
- ✅ Network errors (graceful error messages)
- ✅ Duplicate sends (allows resending, tracks in history)

### Environment Variables Needed

```env
# Required for email
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=orders@ketterly.com  # Optional, has default

# Already have
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Database Schema

**material_order_emails table:**
```sql
id, company_id, order_id, supplier_id, 
recipient_email, recipient_name, subject,
status (sending|sent|failed|bounced),
error_message, sent_by, sent_at
```

**material_orders updates:**
```sql
last_emailed_at, email_count
```

### Next Steps After Testing

If emails send successfully, we're ready for **Step 4: Calendar/Scheduling System**!

### Troubleshooting

**If emails not sending:**
1. Check Resend API key is valid
2. Check domain is verified in Resend
3. Check browser console for errors
4. Check Supabase logs for API errors
5. Verify supplier has email address

**If PDF not attached:**
1. Check PDF generation works (Download PDF button)
2. Check browser console for blob errors
3. Verify Resend attachment size limits

**If status stuck on "sending":**
1. Check API route logs
2. Verify database connection
3. Check RLS policies allow inserts/updates
