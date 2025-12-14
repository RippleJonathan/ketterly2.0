import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { ChangeOrderWithRelations } from '@/lib/types/invoices'

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
  // Change Order title
  changeOrderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
    color: '#f59e0b', // Amber for change orders
  },
  changeOrderNumber: {
    fontSize: 10,
    textAlign: 'right',
    marginBottom: 3,
  },
  statusBadge: {
    fontSize: 8,
    textAlign: 'right',
    padding: 4,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: 3,
    marginTop: 5,
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
  // Description section
  descriptionSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fffbf0',
    border: '1px solid #f59e0b',
    borderRadius: 4,
  },
  descriptionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#92400e',
  },
  descriptionText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#000',
  },
  // Original quote reference
  quoteReference: {
    marginTop: 20,
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f9ff',
    border: '1px solid #0ea5e9',
    borderRadius: 4,
  },
  quoteReferenceTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#075985',
  },
  quoteReferenceText: {
    fontSize: 8,
    color: '#0c4a6e',
  },
  // Totals section
  totalsSection: {
    marginTop: 30,
    marginLeft: 'auto',
    width: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottom: '0.5px solid #ddd',
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 9,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 5,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  // Approval section
  approvalSection: {
    marginTop: 30,
    padding: 12,
    backgroundColor: '#f0fdf4',
    border: '1px solid #22c55e',
    borderRadius: 4,
  },
  approvalTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#166534',
  },
  approvalText: {
    fontSize: 8,
    lineHeight: 1.5,
    color: '#15803d',
  },
  // Signature section
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    gap: 20,
  },
  signatureBox: {
    flex: 1,
    borderTop: '1px solid #000',
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 8,
  },
  signatureImage: {
    maxWidth: 200,
    height: 60,
    marginBottom: 5,
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

interface ChangeOrderPDFProps {
  changeOrder: ChangeOrderWithRelations
  companyName: string
  companyLogo?: string | null
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
}

export const ChangeOrderPDF: React.FC<ChangeOrderPDFProps> = ({
  changeOrder,
  companyName,
  companyLogo,
  companyAddress,
  companyPhone,
  companyEmail,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#dcfce7', text: '#166534' }
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' }
      case 'declined':
        return { bg: '#fee2e2', text: '#991b1b' }
      case 'cancelled':
        return { bg: '#f3f4f6', text: '#374151' }
      default:
        return { bg: '#f3f4f6', text: '#374151' }
    }
  }

  const statusColor = getStatusColor(changeOrder.status)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header with company info */}
        <View style={styles.headerTable}>
          <View style={styles.headerColumn}>
            {companyLogo && (
              <Image src={companyLogo} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>
              {companyAddress && `${companyAddress}\n`}
              {companyPhone && `${companyPhone}\n`}
              {companyEmail && companyEmail}
            </Text>
          </View>
          <View style={styles.headerColumn}>
            <Text style={styles.changeOrderTitle}>CHANGE ORDER</Text>
            <Text style={styles.changeOrderNumber}>
              {changeOrder.change_order_number}
            </Text>
            <Text style={styles.changeOrderNumber}>
              Date: {formatDate(changeOrder.created_at)}
            </Text>
            <View style={{
              ...styles.statusBadge,
              backgroundColor: statusColor.bg,
              color: statusColor.text,
            }}>
              <Text>{changeOrder.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Customer and Quote Info */}
        <View style={styles.infoBoxContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Customer</Text>
            <Text style={styles.infoBoxText}>
              {changeOrder.lead?.full_name || 'N/A'}
              {'\n'}
              {changeOrder.lead?.email || ''}
            </Text>
          </View>
          {changeOrder.quote && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Original Quote</Text>
              <Text style={styles.infoBoxText}>
                {changeOrder.quote.quote_number}
                {changeOrder.quote.title && `\n${changeOrder.quote.title}`}
              </Text>
            </View>
          )}
        </View>

        {/* Change Order Title */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionTitle}>
            {changeOrder.title}
          </Text>
          {changeOrder.description && (
            <Text style={styles.descriptionText}>
              {changeOrder.description}
            </Text>
          )}
        </View>

        {/* Original Quote Reference */}
        {changeOrder.quote && (
          <View style={styles.quoteReference}>
            <Text style={styles.quoteReferenceTitle}>
              This change order modifies the original quote:
            </Text>
            <Text style={styles.quoteReferenceText}>
              Quote #{changeOrder.quote.quote_number}
              {changeOrder.quote.title && ` - ${changeOrder.quote.title}`}
            </Text>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(changeOrder.amount)}
            </Text>
          </View>
          {changeOrder.tax_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Tax ({(changeOrder.tax_rate * 100).toFixed(2)}%):
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(changeOrder.tax_amount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(changeOrder.total)}
            </Text>
          </View>
        </View>

        {/* Approval Information */}
        {changeOrder.status === 'approved' && changeOrder.approved_at && (
          <View style={styles.approvalSection}>
            <Text style={styles.approvalTitle}>Approval Information</Text>
            <Text style={styles.approvalText}>
              Approved on: {formatDate(changeOrder.approved_at)}
              {'\n'}
              {changeOrder.approved_by_user && 
                `Approved by: ${changeOrder.approved_by_user.full_name}`
              }
            </Text>
          </View>
        )}

        {/* Declined Information */}
        {changeOrder.status === 'declined' && changeOrder.declined_at && (
          <View style={{
            ...styles.approvalSection,
            backgroundColor: '#fee2e2',
            borderColor: '#ef4444',
          }}>
            <Text style={{
              ...styles.approvalTitle,
              color: '#991b1b',
            }}>
              Decline Information
            </Text>
            <Text style={{
              ...styles.approvalText,
              color: '#991b1b',
            }}>
              Declined on: {formatDate(changeOrder.declined_at)}
              {changeOrder.declined_reason && 
                `\nReason: ${changeOrder.declined_reason}`
              }
            </Text>
          </View>
        )}

        {/* Notes */}
        {changeOrder.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{changeOrder.notes}</Text>
          </View>
        )}

        {/* Signature Section (for pending/approved) */}
        {(changeOrder.status === 'pending' || changeOrder.status === 'approved') && (
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Customer Signature</Text>
              {changeOrder.customer_signed_at && (
                <Text style={{ fontSize: 7, marginTop: 5 }}>
                  Signed: {formatDate(changeOrder.customer_signed_at)}
                </Text>
              )}
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Company Representative</Text>
              {changeOrder.approved_at && (
                <Text style={{ fontSize: 7, marginTop: 5 }}>
                  Approved: {formatDate(changeOrder.approved_at)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {companyName} • Change Order {changeOrder.change_order_number}
          </Text>
          <Text style={{ marginTop: 2 }}>
            Generated on {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
