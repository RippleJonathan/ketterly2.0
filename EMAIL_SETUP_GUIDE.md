# Email Setup Guide - Prevent Spam

## Current Issue
Emails are going to spam because we're using `notifications@ketterly.com` without domain verification.

## Solution Options

### Option 1: Use Resend's Verified Domain (Quick Fix)
Change the from email to use Resend's verified domain:

1. In Resend dashboard, check what verified domains you have
2. Use their onboarding domain (usually `onboarding@resend.dev`) temporarily
3. Update environment variable:
   ```
   RESEND_FROM_EMAIL=notifications@resend.dev
   ```

### Option 2: Verify Your Own Domain (Recommended)

#### Step 1: Add Domain in Resend
1. Go to Resend Dashboard → Domains
2. Click "Add Domain"
3. Enter: `ketterly.com` (or `rippleroofs.com` for your company)

#### Step 2: Add DNS Records
Resend will provide DNS records. Add these to your domain registrar (GoDaddy, Namecheap, etc.):

**SPF Record:**
```
Type: TXT
Host: @
Value: v=spf1 include:amazonses.com ~all
```

**DKIM Records (Resend provides 3):**
```
Type: CNAME
Host: resend1._domainkey
Value: resend1._domainkey.resend.com

Type: CNAME  
Host: resend2._domainkey
Value: resend2._domainkey.resend.com

Type: CNAME
Host: resend3._domainkey  
Value: resend3._domainkey.resend.com
```

**DMARC Record (Optional but recommended):**
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:jonathan@rippleroofs.com
```

#### Step 3: Verify in Resend
1. Wait 5-60 minutes for DNS propagation
2. Click "Verify" in Resend dashboard
3. Once verified, update environment variable:
   ```
   RESEND_FROM_EMAIL=notifications@rippleroofs.com
   ```

### Option 3: Use Company-Specific Subdomains
For multi-tenant setup where each company gets their own from address:

```typescript
// In unified-notifications.ts
const fromEmail = `${companyName.toLowerCase().replace(/\s+/g, '')}-notifications@rippleroofs.com`
// e.g., rippleroofing-notifications@rippleroofs.com
```

## Additional Best Practices

### 1. Add Unsubscribe Link
Already implemented in email template footer.

### 2. Use Plain Text Version
```typescript
await sendEmail({
  from: 'notifications@rippleroofs.com',
  to: user.email,
  subject: emailSubject,
  html: emailHtml,
  text: 'Plain text version of email' // Add this
})
```

### 3. Warm Up Your Domain
- Start by sending a few emails per day
- Gradually increase volume over 2-3 weeks
- This builds sender reputation

### 4. Monitor Bounce/Complaint Rates
- Check Resend analytics dashboard
- Keep bounce rate < 5%
- Keep complaint rate < 0.1%

## Testing
After setup, test using:
- Mail-tester.com (check spam score)
- Send to multiple email providers (Gmail, Outlook, Yahoo)
- Check email headers for SPF/DKIM pass

## Current Configuration
```env
RESEND_API_KEY=re_ERTDk4iC_P3N48GjsYgfzadrLYrFAPsJ6
RESEND_FROM_EMAIL=notifications@ketterly.com  # ❌ Not verified - causes spam

# Change to:
RESEND_FROM_EMAIL=notifications@resend.dev      # ✅ Quick fix
# OR
RESEND_FROM_EMAIL=notifications@rippleroofs.com # ✅ After domain verification
```
