# Resend Email Setup Guide

## Current Configuration

The application uses **`notifications@ketterly.com`** as the sender email address for all automated emails.

## Required Resend Setup

1. **Log in to Resend Dashboard**: https://resend.com/domains

2. **Verify Domain**: Make sure `ketterly.com` is added and verified

3. **Add Sender Email**: You need to either:
   - **Option A (Recommended)**: Enable wildcard sending for `ketterly.com` domain
     - This allows any email like `notifications@ketterly.com`, `no-reply@ketterly.com`, etc.
   
   - **Option B**: Explicitly verify `notifications@ketterly.com` as a sender address

## Email Addresses Used

| Purpose | From Address | Reply-To |
|---------|-------------|----------|
| Quote to Customer | `{SenderName} via {CompanyName} <notifications@ketterly.com>` | Sender's email |
| Executed Contract | `{CompanyName} <notifications@ketterly.com>` | Company email |
| Document Sharing | `{SenderName} via {CompanyName} <notifications@ketterly.com>` | Sender's email |
| Team Notifications | `Ketterly CRM <notifications@ketterly.com>` | - |

## Testing Email Sending

To verify your Resend setup is working, check the browser console and terminal logs when sending emails. You should see:

```
Fetching PDF for email attachment: http://localhost:3000/api/quotes/{id}/pdf?token={token}
PDF fetch response status: 200 OK
PDF buffer size: XXXXX bytes
PDF attachment created successfully
Sending quote email to: customer@example.com with attachments: YES
Email sent successfully: {resend-message-id}
```

## Troubleshooting

### PDF Not Attached
- Check logs for "includePdf is false" - means PDF attachment was not requested
- Check logs for PDF fetch errors - means PDF generation failed
- Verify buffer size is > 0 bytes

### Email Not Sending
- Error "Domain not verified" → Add domain in Resend dashboard
- Error "Sender not verified" → Add `notifications@ketterly.com` or enable wildcard
- Error "Invalid API key" → Check RESEND_API_KEY in .env.local

### Corrupt PDF Attachment
- PDF generation is working (you can download from UI)
- Issue is in Buffer conversion - check that fetch returns valid PDF content
- Verify Content-Type header in PDF response is `application/pdf`

## Current Issues & Fixes

### ✅ FIXED: Localhost URL in Attachments
- PDFs are now fetched as buffers instead of passing localhost URLs to Resend
- Resend receives actual file content, not a URL to fetch

### ✅ FIXED: Consistent Email Address
- All emails now use `notifications@ketterly.com`
- Previously mixed `noreply@ketterly.com` and `notifications@ketterly.com`

### ✅ FIXED: Include PDF by Default
- Quote emails now include PDF attachment automatically
- Both "Send to Customer" and "Resend Email" buttons pass `includePdf: true`

### 🔄 IN PROGRESS: Dual Signature Email
- Logic exists in `/api/quotes/sign-pdf` route
- Checks for both customer and company_rep signatures
- Sends executed contract email automatically
- **Check terminal logs** when signing to see if email is triggered
