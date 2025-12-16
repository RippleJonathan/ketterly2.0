import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import { QuoteWithRelations } from '@/lib/types/quotes'

// Register fonts (optional - using default fonts for now)
// Font.register({ family: 'Roboto', src: '/fonts/Roboto-Regular.ttf' })

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  // Header section
  headerTable: {
    marginBottom: 15,
    flexDirection: 'row',
    gap: 10,
  },
  headerColumn: {
    flex: 1,
    fontSize: 8,
  },
  logo: {
    width: 100,
    height: 50,
    objectFit: 'contain',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  companyDetails: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#333',
  },
  // Info boxes
  infoBoxContainer: {
    marginTop: 15,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    flex: 1,
    border: '1px solid #000',
    padding: 8,
  },
  infoBoxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    borderBottom: '1px solid #000',
    paddingBottom: 3,
  },
  infoBoxText: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  // Line items table
  table: {
    marginTop: 20,
    marginBottom: 20,
    border: '1px solid #000',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2px solid #000',
    paddingBottom: 5,
    paddingTop: 5,
    paddingHorizontal: 5,
    marginBottom: 0,
    fontWeight: 'bold',
    fontSize: 8,
    backgroundColor: '#f5f5f5',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottom: '0.5px solid #ccc',
    minHeight: 30,
  },
  tableRowLast: {
    borderBottom: 0,
  },
  colDescription: {
    width: '50%',
    paddingRight: 10,
  },
  colQty: {
    width: '15%',
    textAlign: 'right',
    paddingRight: 10,
  },
  colPrice: {
    width: '17.5%',
    textAlign: 'right',
    paddingRight: 10,
  },
  colTotal: {
    width: '17.5%',
    textAlign: 'right',
  },
  itemTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  itemDescription: {
    fontSize: 7,
    color: '#555',
    lineHeight: 1.3,
  },
  itemQuantity: {
    fontSize: 9,
  },
  // Totals section
  totalsContainer: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalsTable: {
    width: '40%',
    minWidth: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottom: '0.5px solid #ddd',
  },
  totalRowGrand: {
    borderTop: '2px solid #000',
    borderBottom: '2px solid #000',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalLabelGrand: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  totalValueGrand: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Payment schedule
  paymentSection: {
    marginTop: 30,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  paymentTable: {
    border: '0.5px solid #000',
  },
  paymentRow: {
    flexDirection: 'row',
    borderBottom: '0.5px solid #000',
  },
  paymentRowLast: {
    borderBottom: 0,
  },
  paymentLabel: {
    width: '70%',
    padding: 5,
    fontSize: 9,
  },
  paymentAmount: {
    width: '30%',
    padding: 5,
    fontSize: 9,
    textAlign: 'right',
    borderLeft: '0.5px solid #000',
  },
  // Signature section
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    gap: 10,
  },
  signatureBox: {
    flex: 1,
    borderTop: '1px solid #000',
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 8,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    color: '#999',
    textAlign: 'center',
    borderTop: '0.5px solid #ddd',
    paddingTop: 5,
  },
  // Notes section
  notesSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fffbf0',
    border: '1px solid #f0ad4e',
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 8,
    lineHeight: 1.4,
  },
})

interface QuotePDFTemplateProps {
  quote: QuoteWithRelations
  companyName: string
  companyLogo?: string | null
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  contractTerms?: string | null
  signatures?: Array<{
    signer_name: string
    signer_type: 'customer' | 'company_rep'
    signer_title?: string | null
    signature_data: string
    signed_at: string
  }>
  changeOrders?: Array<{
    id: string
    change_order_number: string
    title?: string | null
    description?: string | null
    amount: number
    tax_amount: number
    total: number
    line_items: Array<{
      id: string
      description: string
      quantity: number
      unit_price: number
      total: number
      notes?: string | null
    }>
  }>
  originalContractPrice?: number
  originalSubtotal?: number
  currentContractPrice?: number
}

export const QuotePDFTemplate: React.FC<QuotePDFTemplateProps> = ({
  quote,
  companyName,
  companyLogo,
  companyAddress,
  companyPhone,
  companyEmail,
  contractTerms,
  signatures = [],
  changeOrders = [],
  originalContractPrice,
  originalSubtotal,
  currentContractPrice,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Calculate subtotal from line items (most reliable source)
  const calculatedSubtotal = quote.line_items?.reduce((sum, item) => sum + item.line_total, 0) || 0
  
  // Use contract original price if available, otherwise calculated subtotal
  const displaySubtotal = originalSubtotal || originalContractPrice || calculatedSubtotal
  const displayTotal = originalContractPrice || (calculatedSubtotal + (quote.tax_amount || 0) - (quote.discount_amount || 0))

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header with company info */}
        <View style={styles.headerTable}>
          <View style={styles.headerColumn}>
            {companyLogo && <Image src={companyLogo} style={styles.logo} />}
            <Text style={styles.companyName}>{companyName}</Text>
            {companyAddress && (
              <Text style={styles.companyDetails}>{companyAddress}</Text>
            )}
            {companyPhone && (
              <Text style={styles.companyDetails}>Phone: {companyPhone}</Text>
            )}
            {companyEmail && (
              <Text style={styles.companyDetails}>Email: {companyEmail}</Text>
            )}
          </View>
          <View style={styles.headerColumn}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'right' }}>
              {quote.status === 'accepted' ? 'AGREEMENT' : 'ESTIMATE'}
            </Text>
            <Text style={{ fontSize: 8, textAlign: 'right', marginTop: 5 }}>
              Quote #{quote.quote_number}
            </Text>
            <Text style={{ fontSize: 8, textAlign: 'right' }}>
              Date: {formatDate(quote.created_at)}
            </Text>
            {quote.status !== 'accepted' && (
              <Text style={{ fontSize: 8, textAlign: 'right' }}>
                Valid Until: {formatDate(quote.valid_until)}
              </Text>
            )}
          </View>
        </View>

        {/* Customer and Company Rep boxes */}
        <View style={styles.infoBoxContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Customer</Text>
            <Text style={styles.infoBoxText}>
              {quote.lead?.full_name || 'N/A'}
            </Text>
            {quote.lead?.address && (
              <Text style={styles.infoBoxText}>
                {quote.lead.address}
              </Text>
            )}
            {(quote.lead?.city || quote.lead?.state || quote.lead?.zip) && (
              <Text style={styles.infoBoxText}>
                {quote.lead.city && `${quote.lead.city}, `}
                {quote.lead.state && `${quote.lead.state} `}
                {quote.lead.zip}
              </Text>
            )}
            {quote.lead?.phone && (
              <Text style={styles.infoBoxText}>{quote.lead.phone}</Text>
            )}
            {quote.lead?.email && (
              <Text style={styles.infoBoxText}>{quote.lead.email}</Text>
            )}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Company Representative</Text>
            {companyEmail && (
              <Text style={styles.infoBoxText}>{companyEmail}</Text>
            )}
            {companyPhone && (
              <Text style={styles.infoBoxText}>{companyPhone}</Text>
            )}
          </View>
        </View>

        {/* Option Label */}
        {quote.option_label && (
          <Text style={{ fontSize: 10, fontWeight: 'semibold', marginBottom: 15 }}>
            {quote.option_label}
          </Text>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Quantity</Text>
            <Text style={styles.colPrice}>Price</Text>
          </View>

          {/* Table Rows - Line Items */}
          {Array.isArray(quote.line_items) && quote.line_items.length > 0 ? (
            quote.line_items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  ...(index === (quote.line_items?.length || 0) - 1 ? [styles.tableRowLast] : []),
                ]}
              >
                <View style={styles.colDescription}>
                  <Text style={styles.itemTitle}>
                    {item.category && `${item.category} | `}
                    {item.description}
                  </Text>
                  {item.notes && (
                    <Text style={styles.itemDescription}>{item.notes}</Text>
                  )}
                </View>
                <Text style={[styles.colQty, styles.itemQuantity]}>
                  {item.quantity} {item.unit}
                </Text>
                <Text style={[styles.colPrice, styles.itemQuantity]}>
                  {formatCurrency(item.line_total)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>No line items</Text>
            </View>
          )}
        </View>

        {/* Change Orders Section */}
        {changeOrders && changeOrders.length > 0 && (
          <>
            <View style={{ marginTop: 20, marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: 5 }}>
                Approved Change Orders
              </Text>
            </View>

            {changeOrders.map((co, coIndex) => (
              <View key={co.id} style={{ marginBottom: 15, border: '1px solid #ccc', padding: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 5, borderBottom: '0.5px solid #ccc' }}>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                      {co.change_order_number}
                      {co.title && ` - ${co.title}`}
                    </Text>
                    {co.description && (
                      <Text style={{ fontSize: 7, color: '#555', marginTop: 2 }}>
                        {co.description}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                    +{formatCurrency(co.total)}
                  </Text>
                </View>

                {co.line_items && co.line_items.length > 0 && (
                  <View style={{ marginTop: 5 }}>
                    <View style={[styles.tableHeader, { fontSize: 7, paddingVertical: 3 }]}>
                      <Text style={styles.colDescription}>Description</Text>
                      <Text style={styles.colQty}>Qty</Text>
                      <Text style={styles.colPrice}>Unit Price</Text>
                      <Text style={styles.colTotal}>Total</Text>
                    </View>
                    {co.line_items.map((item, itemIndex) => (
                      <View
                        key={item.id}
                        style={[
                          { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 5, borderBottom: '0.5px solid #eee' },
                          itemIndex === co.line_items.length - 1 && { borderBottom: 0 }
                        ]}
                      >
                        <View style={styles.colDescription}>
                          <Text style={{ fontSize: 8 }}>{item.description}</Text>
                          {item.notes && (
                            <Text style={{ fontSize: 6, color: '#666', marginTop: 1 }}>{item.notes}</Text>
                          )}
                        </View>
                        <Text style={[styles.colQty, { fontSize: 8 }]}>{item.quantity}</Text>
                        <Text style={[styles.colPrice, { fontSize: 8 }]}>{formatCurrency(item.unit_price)}</Text>
                        <Text style={[styles.colTotal, { fontSize: 8 }]}>{formatCurrency(item.total)}</Text>
                      </View>
                    ))}
                    <View style={{ marginTop: 5, paddingTop: 5, borderTop: '0.5px solid #ccc' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 2 }}>
                        <Text style={{ fontSize: 7, width: 80, textAlign: 'right', paddingRight: 10 }}>Subtotal:</Text>
                        <Text style={{ fontSize: 7, width: 60, textAlign: 'right' }}>{formatCurrency(co.amount)}</Text>
                      </View>
                      {co.tax_amount > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 2 }}>
                          <Text style={{ fontSize: 7, width: 80, textAlign: 'right', paddingRight: 10 }}>Tax:</Text>
                          <Text style={{ fontSize: 7, width: 60, textAlign: 'right' }}>{formatCurrency(co.tax_amount)}</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 2, borderTop: '0.5px solid #000' }}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', width: 80, textAlign: 'right', paddingRight: 10 }}>Change Order Total:</Text>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', width: 60, textAlign: 'right' }}>+{formatCurrency(co.total)}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculatedSubtotal)}</Text>
            </View>
            {quote.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>-{formatCurrency(quote.discount_amount)}</Text>
              </View>
            )}
            {quote.tax_rate > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax ({(quote.tax_rate * 100).toFixed(2)}%)
                </Text>
                <Text style={styles.totalValue}>{formatCurrency(quote.tax_amount)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.totalRowGrand]}>
              <Text style={styles.totalLabelGrand}>
                {changeOrders && changeOrders.length > 0 ? 'Original Contract Total' : 'Total'}
              </Text>
              <Text style={styles.totalValueGrand}>{formatCurrency(displayTotal)}</Text>
            </View>
            {changeOrders && changeOrders.length > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Approved Change Orders</Text>
                  <Text style={styles.totalValue}>
                    +{formatCurrency(changeOrders.reduce((sum, co) => sum + co.total, 0))}
                  </Text>
                </View>
                <View style={[styles.totalRow, { backgroundColor: '#e8f5e9', borderTop: '2px solid #4caf50', borderBottom: '2px solid #4caf50' }]}>
                  <Text style={[styles.totalLabelGrand, { color: '#2e7d32' }]}>
                    Updated Contract Total
                  </Text>
                  <Text style={[styles.totalValueGrand, { color: '#2e7d32' }]}>
                    {formatCurrency(displayTotal + changeOrders.reduce((sum, co) => sum + co.total, 0))}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Payment Terms */}
        {quote.payment_terms && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Payment Terms</Text>
            <Text style={styles.notesText}>{quote.payment_terms}</Text>
          </View>
        )}

        {/* Additional Notes */}
        {quote.notes && (
          <View style={[styles.notesSection, { marginTop: 10 }]}>
            <Text style={styles.notesTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Contract Terms & Conditions */}
        {contractTerms && (
          <View style={{ marginTop: 15 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 8 }}>Contract Terms & Conditions</Text>
            <Text style={{ fontSize: 7, lineHeight: 1.4 }}>{contractTerms}</Text>
          </View>
        )}

        {/* Signature Section */}
        {/* Signature Section */}
        <View style={styles.signatureSection}>
          {/* Company Authorized Signature */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Company Authorized Signature</Text>
            {signatures.find(s => s.signer_type === 'company_rep') ? (
              <>
                <Image
                  src={signatures.find(s => s.signer_type === 'company_rep')!.signature_data}
                  style={{ width: 150, height: 50, marginTop: 4 }}
                />
                <Text style={{ fontSize: 9, marginTop: 4 }}>
                  {signatures.find(s => s.signer_type === 'company_rep')!.signer_name}
                  {signatures.find(s => s.signer_type === 'company_rep')!.signer_title && 
                    `, ${signatures.find(s => s.signer_type === 'company_rep')!.signer_title}`}
                </Text>
              </>
            ) : null}
          </View>
          
          {/* Company Signature Date */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Date</Text>
            {signatures.find(s => s.signer_type === 'company_rep') && (
              <Text style={{ fontSize: 10, marginTop: 8 }}>
                {formatDate(signatures.find(s => s.signer_type === 'company_rep')!.signed_at)}
              </Text>
            )}
          </View>
          
          {/* Customer Signature */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Customer Signature</Text>
            {signatures.find(s => s.signer_type === 'customer') ? (
              <>
                <Image
                  src={signatures.find(s => s.signer_type === 'customer')!.signature_data}
                  style={{ width: 150, height: 50, marginTop: 4 }}
                />
                <Text style={{ fontSize: 9, marginTop: 4 }}>
                  {signatures.find(s => s.signer_type === 'customer')!.signer_name}
                </Text>
              </>
            ) : null}
          </View>
          
          {/* Customer Signature Date */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Date</Text>
            {signatures.find(s => s.signer_type === 'customer') && (
              <Text style={{ fontSize: 10, marginTop: 8 }}>
                {formatDate(signatures.find(s => s.signer_type === 'customer')!.signed_at)}
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {quote.status === 'accepted' 
              ? `Thank you for choosing ${companyName}`
              : `This estimate is valid until ${formatDate(quote.valid_until)} • Thank you for choosing ${companyName}`
            }
          </Text>
        </View>
      </Page>
    </Document>
  )
}
