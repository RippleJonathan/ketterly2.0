import { formatCurrency } from './formatting'
import { format } from 'date-fns'

// Helper function to generate line items table with source breakdown
function generateLineItemsTable(lineItems: any[], primaryColor: string): string {
  if (!lineItems || lineItems.length === 0) {
    return `
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Unit</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="5">No line items</td></tr>
        </tbody>
      </table>
    `
  }

  // Group items by source_type
  const contractItems = lineItems.filter((item: any) => item.source_type === 'contract')
  const changeOrderItems = lineItems.filter((item: any) => item.source_type === 'change_order')
  const additionalItems = lineItems.filter((item: any) => item.source_type === 'additional')

  let html = `
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
  `

  // Contract Base Items
  if (contractItems.length > 0) {
    html += `
      <tr>
        <td colspan="5" style="background: ${primaryColor}20; font-weight: 600; padding: 8px; color: ${primaryColor};">
          Contract Base
        </td>
      </tr>
    `
    contractItems.forEach((item: any) => {
      html += `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unit || 'ea'}</td>
          <td class="text-right">${formatCurrency(item.unit_price)}</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `
    })
  }

  // Change Order Items
  if (changeOrderItems.length > 0) {
    html += `
      <tr>
        <td colspan="5" style="background: ${primaryColor}20; font-weight: 600; padding: 8px; color: ${primaryColor}; border-top: 2px solid ${primaryColor}40;">
          Change Orders
        </td>
      </tr>
    `
    changeOrderItems.forEach((item: any) => {
      html += `
        <tr>
          <td>${item.description}${item.notes ? ` <span style="color: #666; font-size: 9pt;">(${item.notes})</span>` : ''}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unit || 'ea'}</td>
          <td class="text-right">${formatCurrency(item.unit_price)}</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `
    })
  }

  // Additional Items
  if (additionalItems.length > 0) {
    html += `
      <tr>
        <td colspan="5" style="background: ${primaryColor}20; font-weight: 600; padding: 8px; color: ${primaryColor}; border-top: 2px solid ${primaryColor}40;">
          Additional Items
        </td>
      </tr>
    `
    additionalItems.forEach((item: any) => {
      html += `
        <tr>
          <td>${item.description}${item.notes ? ` <span style="color: #666; font-size: 9pt;">(${item.notes})</span>` : ''}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unit || 'ea'}</td>
          <td class="text-right">${formatCurrency(item.unit_price)}</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `
    })
  }

  html += `
      </tbody>
    </table>
  `

  return html
}

export function generateInvoicePDF(invoice: any): string {
  const company = invoice.companies
  const lead = invoice.leads

  // Format dates
  const invoiceDate = format(new Date(invoice.invoice_date), 'MMMM d, yyyy')
  const dueDate = invoice.due_date
    ? format(new Date(invoice.due_date), 'MMMM d, yyyy')
    : 'Upon receipt'

  // Build HTML for the invoice
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
      padding: 40px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${company?.primary_color || '#1e40af'};
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: ${company?.primary_color || '#1e40af'};
      margin-bottom: 8px;
    }
    
    .company-details {
      font-size: 10pt;
      color: #666;
      line-height: 1.6;
    }
    
    .invoice-title {
      text-align: right;
      flex: 1;
    }
    
    .invoice-title h1 {
      font-size: 28pt;
      font-weight: bold;
      color: ${company?.primary_color || '#1e40af'};
      margin-bottom: 8px;
    }
    
    .invoice-number {
      font-size: 12pt;
      color: #666;
      font-weight: 600;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .info-box {
      flex: 1;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      margin-right: 20px;
    }
    
    .info-box:last-child {
      margin-right: 0;
    }
    
    .info-box h3 {
      font-size: 10pt;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    .info-box p {
      font-size: 11pt;
      margin-bottom: 4px;
    }
    
    .info-box .highlight {
      font-weight: 600;
      color: #000;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    thead {
      background: ${company?.primary_color || '#1e40af'};
      color: white;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    th.text-right {
      text-align: right;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10pt;
    }
    
    td.text-right {
      text-align: right;
    }
    
    tbody tr:last-child td {
      border-bottom: 2px solid ${company?.primary_color || '#1e40af'};
    }
    
    .totals-section {
      margin-left: auto;
      width: 300px;
      margin-top: 20px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      font-size: 11pt;
    }
    
    .totals-row.subtotal {
      color: #666;
    }
    
    .totals-row.total {
      background: ${company?.primary_color || '#1e40af'};
      color: white;
      font-size: 13pt;
      font-weight: bold;
      margin-top: 8px;
      border-radius: 4px;
    }
    
    .amount-due-section {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
      margin-bottom: 30px;
    }
    
    .amount-due-section h3 {
      font-size: 12pt;
      color: #92400e;
      margin-bottom: 8px;
    }
    
    .amount-due-section .amount {
      font-size: 24pt;
      font-weight: bold;
      color: #92400e;
    }
    
    .payment-info {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .payment-info h3 {
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 12px;
      color: #333;
    }
    
    .payment-info p {
      font-size: 10pt;
      color: #666;
      margin-bottom: 6px;
    }
    
    .notes-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    
    .notes-section h3 {
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .notes-section p {
      font-size: 10pt;
      color: #666;
      line-height: 1.6;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9pt;
      color: #999;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-paid {
      background: #d1fae5;
      color: #065f46;
    }
    
    .status-partial {
      background: #fef3c7;
      color: #92400e;
    }
    
    .status-due {
      background: #fee2e2;
      color: #991b1b;
    }
    
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="company-info">
      <div class="company-name">${company?.name || 'Company Name'}</div>
      <div class="company-details">
        ${company?.address ? `${company.address}<br>` : ''}
        ${company?.city && company?.state ? `${company.city}, ${company.state} ${company.zip || ''}<br>` : ''}
        ${company?.contact_phone ? `Phone: ${company.contact_phone}<br>` : ''}
        ${company?.contact_email ? `Email: ${company.contact_email}` : ''}
      </div>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div class="invoice-number">${invoice.invoice_number}</div>
    </div>
  </div>

  <!-- Invoice Info Section -->
  <div class="info-section">
    <div class="info-box">
      <h3>Bill To</h3>
      <p class="highlight">${lead?.full_name || 'Customer Name'}</p>
      ${lead?.email ? `<p>${lead.email}</p>` : ''}
      ${lead?.phone ? `<p>${lead.phone}</p>` : ''}
      ${lead?.address ? `<p>${lead.address}</p>` : ''}
      ${lead?.city && lead?.state ? `<p>${lead.city}, ${lead.state} ${lead.zip || ''}</p>` : ''}
    </div>
    
    <div class="info-box">
      <h3>Invoice Details</h3>
      <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
      <p><strong>Due Date:</strong> ${dueDate}</p>
      ${invoice.payment_terms ? `<p><strong>Terms:</strong> ${invoice.payment_terms}</p>` : ''}
      ${invoice.quotes ? `<p><strong>Quote Ref:</strong> ${invoice.quotes.quote_number}</p>` : ''}
    </div>
  </div>

  <!-- Line Items Table with Source Breakdown -->
  ${generateLineItemsTable(invoice.invoice_line_items, company?.primary_color || '#1e40af')}


  <!-- Totals -->
  <div class="totals-section">
    <div class="totals-row subtotal">
      <span>Subtotal:</span>
      <span>${formatCurrency(invoice.subtotal)}</span>
    </div>
    ${
      invoice.tax_amount > 0
        ? `
    <div class="totals-row subtotal">
      <span>Tax:</span>
      <span>${formatCurrency(invoice.tax_amount)}</span>
    </div>
    `
        : ''
    }
    <div class="totals-row total">
      <span>Total:</span>
      <span>${formatCurrency(invoice.total)}</span>
    </div>
    ${
      invoice.amount_paid > 0
        ? `
    <div class="totals-row subtotal" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
      <span>Amount Paid:</span>
      <span style="color: #059669;">${formatCurrency(invoice.amount_paid)}</span>
    </div>
    `
        : ''
    }
  </div>

  <!-- Amount Due -->
  ${
    invoice.balance_due > 0
      ? `
  <div class="amount-due-section">
    <h3>Amount Due</h3>
    <div class="amount">${formatCurrency(invoice.balance_due)}</div>
    <p style="margin-top: 8px; font-size: 10pt; color: #92400e;">
      Payment is due by ${dueDate}
    </p>
  </div>
  `
      : `
  <div style="background: #d1fae5; border: 2px solid #059669; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: center;">
    <h3 style="color: #065f46; font-size: 14pt; margin-bottom: 8px;">PAID IN FULL</h3>
    <p style="color: #065f46; font-size: 10pt;">Thank you for your payment!</p>
  </div>
  `
  }

  <!-- Payment Information -->
  <div class="payment-info">
    <h3>Payment Information</h3>
    <p><strong>Make checks payable to:</strong> ${company?.name || 'Company Name'}</p>
    ${company?.address ? `<p><strong>Mail payments to:</strong> ${company.address}, ${company.city || ''}, ${company.state || ''} ${company.zip || ''}</p>` : ''}
    ${company?.contact_phone ? `<p><strong>Questions?</strong> Call us at ${company.contact_phone}</p>` : ''}
  </div>

  <!-- Notes -->
  ${
    invoice.notes
      ? `
  <div class="notes-section">
    <h3>Notes</h3>
    <p>${invoice.notes}</p>
  </div>
  `
      : ''
  }

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for your business!</p>
    <p>This invoice was generated on ${format(new Date(), 'MMMM d, yyyy')}</p>
  </div>
</body>
</html>
  `

  return html
}
