import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { WorkOrder } from '@/lib/types/work-orders'
import { format } from 'date-fns'

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
  tableColType: {
    width: '12%',
  },
  tableColDescription: {
    width: '35%',
  },
  itemNotes: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 4,
  },
  tableColQuantity: {
    width: '12%',
    textAlign: 'right',
  },
  tableColUnit: {
    width: '10%',
    textAlign: 'center',
  },
  tableColUnitPrice: {
    width: '15%',
    textAlign: 'right',
  },
  tableColTotal: {
    width: '16%',
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
    border: '1px solid #e5e7eb',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
})

interface WorkOrderPDFProps {
  workOrder: WorkOrder
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
  location?: {
    id: string
    name?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    phone?: string | null
    email?: string | null
  } | null
}

export function WorkOrderPDF({ workOrder, company, location }: WorkOrderPDFProps) {
  // Use location data with fallback to company data
  const businessName = location?.name || company?.name || 'Company Name'
  const businessLogo = company?.logo_url // Logo stays at company level
  const businessAddress = location?.address || company?.address || ''
  const businessCity = location?.city || company?.city || ''
  const businessState = location?.state || company?.state || ''
  const businessZip = location?.zip || company?.zip || ''
  const businessPhone = location?.phone || company?.contact_phone || ''
  const businessEmail = location?.email || company?.contact_email || ''
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return format(new Date(date), 'MMMM d, yyyy')
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {businessLogo && (
            <Image src={businessLogo} style={styles.companyLogo} />
          )}
          <Text style={styles.companyName}>{businessName}</Text>
          {businessAddress && (
            <Text style={styles.companyInfo}>{businessAddress}</Text>
          )}
          {(businessCity || businessState) && (
            <Text style={styles.companyInfo}>
              {businessCity}, {businessState} {businessZip}
            </Text>
          )}
          {businessPhone && (
            <Text style={styles.companyInfo}>Phone: {businessPhone}</Text>
          )}
          {businessEmail && (
            <Text style={styles.companyInfo}>Email: {businessEmail}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>WORK ORDER</Text>

        {/* Work Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Order Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Work Order #:</Text>
            <Text style={styles.value}>
              {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Title:</Text>
            <Text style={styles.value}>{workOrder.title}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{workOrder.status.toUpperCase()}</Text>
          </View>
          {workOrder.scheduled_date && (
            <View style={styles.row}>
              <Text style={styles.label}>Scheduled Date:</Text>
              <Text style={styles.value}>{formatDate(workOrder.scheduled_date)}</Text>
            </View>
          )}
          {workOrder.estimated_duration_hours && (
            <View style={styles.row}>
              <Text style={styles.label}>Estimated Duration:</Text>
              <Text style={styles.value}>{workOrder.estimated_duration_hours} hours</Text>
            </View>
          )}
        </View>

        {/* Subcontractor Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {workOrder.subcontractor_name ? 'Subcontractor' : 'Assignment'}
          </Text>
          {workOrder.subcontractor_name ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Company:</Text>
                <Text style={styles.value}>{workOrder.subcontractor_name}</Text>
              </View>
              {workOrder.subcontractor_email && (
                <View style={styles.row}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.value}>{workOrder.subcontractor_email}</Text>
                </View>
              )}
              {workOrder.subcontractor_phone && (
                <View style={styles.row}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text style={styles.value}>{workOrder.subcontractor_phone}</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.value}>Internal Work - No external subcontractor</Text>
          )}
        </View>

        {/* Job Site */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Site</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{workOrder.job_site_address}</Text>
          </View>
          {(workOrder.job_site_city || workOrder.job_site_state) && (
            <View style={styles.row}>
              <Text style={styles.label}>City, State, ZIP:</Text>
              <Text style={styles.value}>
                {workOrder.job_site_city}, {workOrder.job_site_state} {workOrder.job_site_zip}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {workOrder.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.value}>{workOrder.description}</Text>
          </View>
        )}

        {/* Line Items */}
        {workOrder.line_items && workOrder.line_items.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableColType}>Type</Text>
              <Text style={styles.tableColDescription}>Description</Text>
              <Text style={styles.tableColQuantity}>Qty</Text>
              <Text style={styles.tableColUnit}>Unit</Text>
              <Text style={styles.tableColUnitPrice}>Unit Price</Text>
              <Text style={styles.tableColTotal}>Total</Text>
            </View>

            {/* Table Rows */}
            {workOrder.line_items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.tableColType}>{item.item_type}</Text>
                <View style={styles.tableColDescription}>
                  <Text>{item.description}</Text>
                  {item.notes && (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  )}
                </View>
                <Text style={styles.tableColQuantity}>{item.quantity}</Text>
                <Text style={styles.tableColUnit}>{item.unit}</Text>
                <Text style={styles.tableColUnitPrice}>{formatCurrency(item.unit_price)}</Text>
                <Text style={styles.tableColTotal}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          {workOrder.labor_cost > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Labor:</Text>
              <Text style={styles.totalValue}>{formatCurrency(workOrder.labor_cost)}</Text>
            </View>
          )}
          {workOrder.materials_cost > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Materials:</Text>
              <Text style={styles.totalValue}>{formatCurrency(workOrder.materials_cost)}</Text>
            </View>
          )}
          {workOrder.equipment_cost > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Equipment:</Text>
              <Text style={styles.totalValue}>{formatCurrency(workOrder.equipment_cost)}</Text>
            </View>
          )}
          {workOrder.other_costs > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Other:</Text>
              <Text style={styles.totalValue}>{formatCurrency(workOrder.other_costs)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(workOrder.subtotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(workOrder.total_amount)}</Text>
          </View>
        </View>

        {/* Special Instructions */}
        {workOrder.special_instructions && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Special Instructions:</Text>
            <Text style={styles.notesText}>{workOrder.special_instructions}</Text>
          </View>
        )}

        {/* Materials Info */}
        {workOrder.requires_materials && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Materials:</Text>
            <Text style={styles.notesText}>
              {workOrder.materials_will_be_provided
                ? 'Materials will be provided by the company.'
                : 'Subcontractor is responsible for providing materials.'}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This work order was generated on {formatDate(new Date().toISOString())}
          </Text>
          <Text>{company.name} - Work Order Document</Text>
        </View>
      </Page>
    </Document>
  )
}
