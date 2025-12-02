# Email System Setup Guide

## Overview
Ketterly CRM uses Resend for email delivery. Emails are sent from user's actual email addresses (e.g., john@rippleroofing.com) with authentication via ketterly.com domain.

## Resend Setup (One-time)

### 1. Create Resend Account
1. Go to https://resend.com
2. Sign up with your email
3. Verify your email address

### 2. Add Domain (ketterly.com)
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter: `ketterly.com`
4. Click **Add**

### 3. Configure DNS Records
Add these DNS records to your Ketterly.com domain (via your domain registrar):

**SPF Record:**
```
Type: TXT
Name: @ (or ketterly.com)
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record (Resend will provide specific values):**
```
Type: TXT
Name: resend._domainkey
Value: [Copy from Resend dashboard]
```

**DMARC Record (Optional but recommended):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@ketterly.com
```

### 4. Get API Key
1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: "Ketterly CRM Production"
4. Copy the API key (starts with `re_`)

### 5. Add to Environment Variables
Add to your `.env.local`:
```bash
RESEND_API_KEY=re_your_actual_api_key_here
NEXT_PUBLIC_APP_URL=https://ketterly.com  # Or your production URL
```

## How It Works

### Customer Emails (From Users)
When a sales rep sends a quote:
```
From: John Smith <john@rippleroofing.com>
Reply-To: john@rippleroofing.com
Authenticated via: ketterly.com
```

Customer sees it as coming from John and replies go to john@rippleroofing.com.

### System Notifications (From CRM)
When system sends notifications:
```
From: Ketterly CRM <notifications@ketterly.com>
Reply-To: noreply@ketterly.com
```

## Testing

### 1. Run Migration
```bash
npx supabase db push
```

This creates the `notification_settings` table.

### 2. Test Email Sending
Create a test API route:

```typescript
// app/api/test-email/route.ts
import { sendEmail } from '@/lib/email/resend'

export async function GET() {
  const result = await sendEmail({
    from: 'Test <test@ketterly.com>',
    to: 'your-email@gmail.com',
    subject: 'Ketterly CRM Test Email',
    html: '<p>If you receive this, Resend is configured correctly!</p>',
  })

  return Response.json(result)
}
```

Visit: `http://localhost:3000/api/test-email`

## Notification Settings

### Default Settings (All enabled by default)
- ✅ Quote sent to customer
- ✅ Quote accepted (notify team)
- ✅ Invoice sent to customer
- ✅ Payment received confirmation
- ✅ New lead notifications
- ✅ Project completion review request

### Future Settings UI
Will be added to `/admin/settings` under "Notifications" tab where companies can toggle each notification type.

## Email Templates

### Available Templates
1. **Quote Email** - Sent when sales rep sends quote to customer
2. **Quote Accepted** - Notifies team when quote is signed
3. **Invoice Email** - Sent when invoice is created
4. **Payment Confirmation** - Thanks customer for payment

### Customization
Templates use company branding:
- Company name
- Logo (if uploaded)
- Primary color
- Sender's name and email

## Cost Estimate

Resend Pricing:
- **Free**: 3,000 emails/month (good for starting out)
- **Pro**: $20/month for 50,000 emails
- **Business**: $80/month for 100,000 emails

Average roofing company usage:
- ~50-100 quotes/month = 50-100 emails
- ~20-40 invoices/month = 20-40 emails
- Notifications = ~100-200 emails/month

**Total: ~200-400 emails/month** - Well within free tier!

## Troubleshooting

### Emails going to spam
1. Verify DNS records are correctly configured
2. Wait 24-48 hours for DNS propagation
3. Check SPF/DKIM/DMARC alignment in Resend dashboard

### Emails not sending
1. Check `RESEND_API_KEY` is set in environment variables
2. Verify domain is verified in Resend dashboard
3. Check console logs for error messages

### Reply-to not working
Reply-to emails go to the user's actual email (e.g., john@rippleroofing.com). Make sure this email exists and they check it regularly.

## Security

### API Key Protection
- Never commit API keys to git
- Store in `.env.local` (gitignored)
- Use different keys for development and production

### Email Validation
- All recipient emails are validated before sending
- Notification settings checked before each email
- Failed sends are logged but don't break the app

## Next Steps

Once email is set up:
1. ✅ Migration run (notification_settings table)
2. ✅ Resend configured and verified
3. ⏳ Add "Send Quote" button to quote detail page
4. ⏳ Add notification settings UI to admin settings
5. ⏳ Test complete workflow: create quote → send → customer receives → signs → team notified

---

**Questions?** Check Resend docs: https://resend.com/docs
