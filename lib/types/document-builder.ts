// Document Builder Types
// For creating customizable document templates with eSignature support

export type DocumentCategory = 'contract' | 'work_order' | 'proposal' | 'invoice' | 'custom'

export type DocumentStatus = 
  | 'draft' 
  | 'sent' 
  | 'pending_signatures' 
  | 'signed' 
  | 'declined' 
  | 'voided'

export type SectionType = 
  | 'header'
  | 'text'
  | 'customer_info'
  | 'pricing_table'
  | 'terms'
  | 'signatures'
  | 'custom'

export interface DocumentSection {
  id: string
  type: SectionType
  title?: string
  content: SectionContent
  settings?: SectionSettings
}

export interface SectionContent {
  // Text sections (HTML content)
  text?: string
  
  // Customer info fields
  fields?: Array<{
    label: string
    variable: string
    format?: 'text' | 'currency' | 'date' | 'phone' | 'email'
  }>
  
  // Pricing table options
  showLineItems?: boolean
  showSubtotal?: boolean
  showTax?: boolean
  showTotal?: boolean
  customColumns?: string[]
  
  // Signature blocks
  signers?: Array<{
    type: 'customer' | 'company'
    label: string
    showDate: boolean
    showName: boolean
  }>
  
  // Custom content
  customContent?: any
}

export interface SectionSettings {
  backgroundColor?: string
  borderTop?: boolean
  borderBottom?: boolean
  padding?: string
  textAlign?: 'left' | 'center' | 'right'
}

export interface DocumentTemplate {
  id: string
  company_id: string | null
  name: string
  description: string | null
  category: DocumentCategory
  sections: DocumentSection[]
  is_global: boolean
  is_active: boolean
  page_size: 'letter' | 'a4'
  margins: { top: number; right: number; bottom: number; left: number }
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GeneratedDocument {
  id: string
  company_id: string
  template_id: string | null
  lead_id: string | null
  quote_id: string | null
  project_id: string | null
  title: string
  document_number: string | null
  sections: DocumentSection[]
  pdf_url: string | null
  pdf_generated_at: string | null
  status: DocumentStatus
  customer_signature_data: string | null
  customer_signature_ip: string | null
  customer_signed_at: string | null
  customer_signed_by_name: string | null
  customer_signed_by_email: string | null
  company_signature_data: string | null
  company_signature_ip: string | null
  company_signed_at: string | null
  company_signed_by: string | null
  share_token: string | null
  share_link_expires_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GeneratedDocumentWithRelations extends GeneratedDocument {
  lead?: { full_name: string; email: string; phone: string; property_address: string }
  quote?: { quote_number: string; subtotal: number; tax: number; total: number }
  project?: { project_number: string; status: string }
  template?: { name: string; category: string }
  creator?: { full_name: string; email: string }
}

// Variable system
export interface DocumentVariable {
  label: string
  category: 'Company' | 'Customer' | 'Quote' | 'Project' | 'System'
  format?: 'text' | 'currency' | 'date' | 'phone' | 'email'
}

export const DOCUMENT_VARIABLES: Record<string, DocumentVariable> = {
  // Company variables
  'company.name': { label: 'Company Name', category: 'Company' },
  'company.address': { label: 'Company Address', category: 'Company' },
  'company.city': { label: 'Company City', category: 'Company' },
  'company.state': { label: 'Company State', category: 'Company' },
  'company.zip': { label: 'Company ZIP', category: 'Company' },
  'company.phone': { label: 'Company Phone', category: 'Company', format: 'phone' },
  'company.email': { label: 'Company Email', category: 'Company', format: 'email' },
  
  // Customer/Lead variables
  'customer.name': { label: 'Customer Name', category: 'Customer' },
  'customer.email': { label: 'Customer Email', category: 'Customer', format: 'email' },
  'customer.phone': { label: 'Customer Phone', category: 'Customer', format: 'phone' },
  'customer.address': { label: 'Property Address', category: 'Customer' },
  'customer.city': { label: 'City', category: 'Customer' },
  'customer.state': { label: 'State', category: 'Customer' },
  'customer.zip': { label: 'ZIP Code', category: 'Customer' },
  
  // Quote variables
  'quote.number': { label: 'Quote Number', category: 'Quote' },
  'quote.subtotal': { label: 'Subtotal', category: 'Quote', format: 'currency' },
  'quote.tax': { label: 'Tax Amount', category: 'Quote', format: 'currency' },
  'quote.total': { label: 'Total Amount', category: 'Quote', format: 'currency' },
  'quote.created_date': { label: 'Quote Date', category: 'Quote', format: 'date' },
  
  // Project variables
  'project.number': { label: 'Project Number', category: 'Project' },
  'project.start_date': { label: 'Project Start Date', category: 'Project', format: 'date' },
  'project.end_date': { label: 'Project End Date', category: 'Project', format: 'date' },
  
  // System variables
  'today': { label: 'Today\'s Date', category: 'System', format: 'date' },
  'current_year': { label: 'Current Year', category: 'System' },
  'current_month': { label: 'Current Month', category: 'System' },
} as const

// Category labels
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contract: 'Contract',
  work_order: 'Work Order',
  proposal: 'Proposal',
  invoice: 'Invoice',
  custom: 'Custom',
}

// Category colors for badges
export const DOCUMENT_CATEGORY_COLORS: Record<DocumentCategory, any> = {
  contract: 'default',
  work_order: 'secondary',
  proposal: 'outline',
  invoice: 'default',
  custom: 'secondary',
}

// Status labels
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  pending_signatures: 'Pending Signatures',
  signed: 'Signed',
  declined: 'Declined',
  voided: 'Voided',
}

// Status colors for badges
export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  pending_signatures: 'bg-yellow-100 text-yellow-800',
  signed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  voided: 'bg-gray-100 text-gray-600',
}
