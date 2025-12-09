import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { MaterialOrder } from '@/lib/types/material-orders'

// Register fonts if needed (optional - system fonts work fine)
// Font.register({
//   family: 'Roboto',
//   src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
// })

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  companyLogo: {
    width: 120,
    height: 60,
    objectFit: 'contain',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e40af',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#374151',
  },
  value: {
    width: '70%',
    color: '#111827',
  },
  table: {
    marginTop: 15,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '2px solid #d1d5db',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 8,
  },
  tableColDescription: {
    width: '30%',
  },
  tableColVariant: {
    width: '15%',
  },
  tableColQuantity: {
    width: '12%',
    textAlign: 'right',
  },
  tableColUnit: {
    width: '8%',
    textAlign: 'center',
  },
  tableColUnitCost: {
    width: '17.5%',
    textAlign: 'right',
  },
  tableColTotal: {
    width: '17.5%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  totalLabel: {
    fontSize: 10,
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '2px solid #d1d5db',
    paddingTop: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    fontSize: 9,
    color: '#4b5563',
  },
  notesTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
})

interface PurchaseOrderPDFProps {
  order: MaterialOrder
  company: {
    name: string
    logo_url?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    contact_phone?: string | null
    contact_email?: string | null
  }
}

export function PurchaseOrderPDF({ order, company }: PurchaseOrderPDFProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const items = order.items || []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Company Info */}
        <View style={styles.header}>
          {company.logo_url && (
            <Image src={company.logo_url} style={styles.companyLogo} />
          )}
          <Text style={styles.companyName}>{company.name}</Text>
          {company.address && (
            <Text style={styles.companyInfo}>
              {company.address}
              {company.city && `, ${company.city}`}
              {company.state && `, ${company.state}`}
              {company.zip && ` ${company.zip}`}
            </Text>
          )}
          {company.contact_phone && (
            <Text style={styles.companyInfo}>Phone: {company.contact_phone}</Text>
          )}
          {company.contact_email && (
            <Text style={styles.companyInfo}>Email: {company.contact_email}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>PURCHASE ORDER</Text>

        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>PO Number:</Text>
            <Text style={styles.value}>{order.order_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Order Date:</Text>
            <Text style={styles.value}>{formatDate(order.order_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expected Delivery:</Text>
            <Text style={styles.value}>{formatDate(order.expected_delivery_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{order.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          {order.template_name && (
            <View style={styles.row}>
              <Text style={styles.label}>Template:</Text>
              <Text style={styles.value}>{order.template_name}</Text>
            </View>
          )}
        </View>

        {/* Supplier Information */}
        {order.supplier && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{order.supplier.name}</Text>
            </View>
            {order.supplier.contact_name && (
              <View style={styles.row}>
                <Text style={styles.label}>Contact:</Text>
                <Text style={styles.value}>{order.supplier.contact_name}</Text>
              </View>
            )}
            {order.supplier.email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{order.supplier.email}</Text>
              </View>
            )}
            {order.supplier.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{order.supplier.phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColDescription}>Description</Text>
            <Text style={styles.tableColVariant}>Variant</Text>
            <Text style={styles.tableColQuantity}>Qty</Text>
            <Text style={styles.tableColUnit}>Unit</Text>
            <Text style={styles.tableColUnitCost}>Unit Cost</Text>
            <Text style={styles.tableColTotal}>Total</Text>
          </View>
          {items.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableColDescription}>
                <Text>{item.description}</Text>
                {item.notes && (
                  <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>
                    {item.notes}
                  </Text>
                )}
              </View>
              <Text style={styles.tableColVariant}>
                {item.variant_name || '-'}
              </Text>
              <Text style={styles.tableColQuantity}>{item.quantity}</Text>
              <Text style={styles.tableColUnit}>{item.unit}</Text>
              <Text style={styles.tableColUnitCost}>
                {formatCurrency(item.estimated_unit_cost || 0)}
              </Text>
              <Text style={styles.tableColTotal}>
                {formatCurrency((item.quantity * (item.estimated_unit_cost || 0)))}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_estimated)}</Text>
          </View>
          {order.tax_rate > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax ({(order.tax_rate * 100).toFixed(2)}%):
                </Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(order.tax_amount || 0)}
                </Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total:</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(order.total_with_tax || order.total_estimated)}
                </Text>
              </View>
            </>
          )}
          {order.tax_rate === 0 && (
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total:</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(order.total_estimated)}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes:</Text>
            <Text>{order.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This is a computer-generated purchase order from {company.name}
          </Text>
          <Text>
            Generated on {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
