/**
 * Email Templates for Ketterly CRM
 * All templates use the company's branding and user information
 */

interface EmailTemplateProps {
  companyName: string
  companyLogo?: string
  primaryColor?: string
}

/**
 * Base email layout wrapper
 */
export function emailLayout(content: string, props: EmailTemplateProps): string {
  const { companyName, companyLogo, primaryColor = '#1e40af' } = props

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid ${primaryColor};
      margin-bottom: 30px;
    }
    .logo {
      max-width: 200px;
      height: auto;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: ${primaryColor};
      margin: 10px 0;
    }
    .content {
      padding: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${primaryColor};
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .quote-details {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-label {
      font-weight: 600;
      color: #4b5563;
    }
    .detail-value {
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="header">
    ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo">` : `<div class="company-name">${companyName}</div>`}
  </div>
  
  <div class="content">
    ${content}
  </div>
  
  <div class="footer">
    <p>This email was sent from ${companyName} via Ketterly CRM</p>
    <p>Please do not reply to this email. Contact us directly for questions.</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Quote sent to customer email template
 */
interface QuoteEmailProps extends EmailTemplateProps {
  customerName: string
  quoteNumber: string
  quoteTitle: string
  totalAmount: string
  validUntil: string
  viewQuoteUrl: string
  senderName: string
  senderPhone?: string
}

export function quoteEmailTemplate(props: QuoteEmailProps): string {
  const content = `
    <p style="font-size: 16px;">Hi ${props.customerName},</p>
    
    <p style="font-size: 16px;">Thank you for the opportunity to earn your business! I've prepared a detailed quote for your roofing project.</p>
    
    <p style="font-size: 16px;">Your personalized estimate includes:</p>
    <ul style="font-size: 16px; line-height: 1.8;">
      <li>Complete breakdown of labor and materials</li>
      <li>Project timeline and warranty information</li>
      <li>Terms and conditions</li>
    </ul>
    
    <div style="background: linear-gradient(135deg, ${props.primaryColor || '#1e40af'} 0%, ${props.primaryColor ? adjustColor(props.primaryColor, -20) : '#1e3a8a'} 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <p style="color: white; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">Ready to review your quote?</p>
      <a href="${props.viewQuoteUrl}" class="button" style="background-color: white; color: ${props.primaryColor || '#1e40af'}; display: inline-block; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        View Your Quote
      </a>
      <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 15px 0 0 0;">Quote #${props.quoteNumber} • Valid until ${props.validUntil}</p>
    </div>
    
    <p style="font-size: 16px;">Click the button above to review all the details and digitally sign if you're ready to move forward.</p>
    
    <p style="font-size: 16px;">Have questions? I'm here to help!</p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
      <p style="margin: 5px 0; font-size: 16px;"><strong>${props.senderName}</strong></p>
      <p style="margin: 5px 0; color: #6b7280; font-size: 15px;">${props.companyName}</p>
      ${props.senderPhone ? `<p style="margin: 5px 0; color: #6b7280; font-size: 15px;">📞 <a href="tel:${props.senderPhone}" style="color: ${props.primaryColor || '#1e40af'}; text-decoration: none;">${props.senderPhone}</a></p>` : ''}
    </div>
  `

  return emailLayout(content, props)
}

// Helper function to darken color for gradient
function adjustColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1)
}

/**
 * Quote accepted - notify team
 */
interface QuoteAcceptedNotificationProps extends EmailTemplateProps {
  quoteNumber: string
  quoteTitle: string
  customerName: string
  totalAmount: string
  signedBy: string
  signedAt: string
  viewQuoteUrl: string
}

export function quoteAcceptedNotificationTemplate(props: QuoteAcceptedNotificationProps): string {
  const content = `
    <h2 style="color: #059669;">🎉 Quote Accepted!</h2>
    
    <p>Great news! A quote has been accepted and is ready to move to production.</p>
    
    <div class="quote-details">
      <div class="detail-row">
        <span class="detail-label">Quote Number:</span>
        <span class="detail-value">${props.quoteNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project:</span>
        <span class="detail-value">${props.quoteTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Customer:</span>
        <span class="detail-value">${props.customerName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total Amount:</span>
        <span class="detail-value">${props.totalAmount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Signed By:</span>
        <span class="detail-value">${props.signedBy}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Signed At:</span>
        <span class="detail-value">${props.signedAt}</span>
      </div>
    </div>
    
    <p style="text-align: center;">
      <a href="${props.viewQuoteUrl}" class="button">View Quote Details</a>
    </p>
    
    <p><strong>Next Steps:</strong></p>
    <ul>
      <li>Generate deposit invoice</li>
      <li>Schedule crew once deposit is received</li>
      <li>Order materials</li>
    </ul>
  `

  return emailLayout(content, props)
}

/**
 * Invoice sent to customer
 */
interface InvoiceEmailProps extends EmailTemplateProps {
  customerName: string
  invoiceNumber: string
  invoiceType: string
  totalAmount: string
  dueDate: string
  viewInvoiceUrl: string
  senderName: string
}

export function invoiceEmailTemplate(props: InvoiceEmailProps): string {
  const content = `
    <p>Hi ${props.customerName},</p>
    
    <p>Your ${props.invoiceType} invoice is ready for payment.</p>
    
    <div class="quote-details">
      <div class="detail-row">
        <span class="detail-label">Invoice Number:</span>
        <span class="detail-value">${props.invoiceNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type:</span>
        <span class="detail-value">${props.invoiceType}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount Due:</span>
        <span class="detail-value">${props.totalAmount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date:</span>
        <span class="detail-value">${props.dueDate}</span>
      </div>
    </div>
    
    <p style="text-align: center;">
      <a href="${props.viewInvoiceUrl}" class="button">View Invoice</a>
    </p>
    
    <p><strong>Payment Methods:</strong></p>
    <ul>
      <li>Check (payable to ${props.companyName})</li>
      <li>Credit Card</li>
      <li>ACH/Bank Transfer</li>
    </ul>
    
    <p>If you have any questions about this invoice, please let me know.</p>
    
    <p>Thank you,<br>${props.senderName}<br>${props.companyName}</p>
  `

  return emailLayout(content, props)
}

/**
 * Payment received confirmation
 */
interface PaymentConfirmationProps extends EmailTemplateProps {
  customerName: string
  paymentAmount: string
  paymentMethod: string
  invoiceNumber: string
  remainingBalance: string
}

export function paymentConfirmationTemplate(props: PaymentConfirmationProps): string {
  const content = `
    <h2 style="color: #059669;">✓ Payment Received</h2>
    
    <p>Hi ${props.customerName},</p>
    
    <p>Thank you! We've received your payment.</p>
    
    <div class="quote-details">
      <div class="detail-row">
        <span class="detail-label">Amount Paid:</span>
        <span class="detail-value">${props.paymentAmount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Method:</span>
        <span class="detail-value">${props.paymentMethod}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Invoice Number:</span>
        <span class="detail-value">${props.invoiceNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Remaining Balance:</span>
        <span class="detail-value">${props.remainingBalance}</span>
      </div>
    </div>
    
    ${props.remainingBalance === '$0.00' 
      ? '<p style="color: #059669; font-weight: 600;">Your invoice is now paid in full. Thank you!</p>' 
      : '<p>We\'ll send a final invoice for the remaining balance upon project completion.</p>'
    }
    
    <p>We appreciate your business!</p>
    
    <p>Best regards,<br>${props.companyName}</p>
  `

  return emailLayout(content, props)
}
