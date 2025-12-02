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
}

export function quoteEmailTemplate(props: QuoteEmailProps): string {
  const content = `
    <p>Hi ${props.customerName},</p>
    
    <p>Thank you for considering ${props.companyName} for your roofing project!</p>
    
    <p>I've prepared a detailed estimate for you:</p>
    
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
        <span class="detail-label">Total Amount:</span>
        <span class="detail-value">${props.totalAmount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Valid Until:</span>
        <span class="detail-value">${props.validUntil}</span>
      </div>
    </div>
    
    <p style="text-align: center;">
      <a href="${props.viewQuoteUrl}" class="button">View & Accept Quote</a>
    </p>
    
    <p>You can review the complete details, including all line items and terms, by clicking the button above. If you have any questions or would like to discuss the estimate, please don't hesitate to reach out.</p>
    
    <p>Best regards,<br>${props.senderName}<br>${props.companyName}</p>
  `

  return emailLayout(content, props)
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
