// Document Type Definitions
// Auto-generated types will come from database, these are supplementary

export type DocumentType = 
  | 'quote'
  | 'contract'
  | 'invoice'
  | 'photo'
  | 'receipt'
  | 'permit'
  | 'insurance'
  | 'warranty'
  | 'change_order'
  | 'completion'
  | 'other'

export type SignatureStatus = 
  | 'pending'
  | 'signed'
  | 'declined'
  | 'expired'

export type SignatureFieldType = 
  | 'signature'
  | 'initial'
  | 'date'
  | 'text'

export type SignerRole = 
  | 'customer'
  | 'company'
  | 'crew_lead'

export type VerificationMethod = 
  | 'email_link'
  | 'sms_code'
  | 'none'

// Document with relations
export interface DocumentWithRelations {
  id: string
  company_id: string
  lead_id: string
  document_type: DocumentType
  title: string
  description: string | null
  file_url: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  version: number
  supersedes_id: string | null
  requires_signature: boolean
  signature_status: SignatureStatus | null
  quote_id: string | null
  invoice_id: string | null
  uploaded_by: string | null
  uploaded_at: string
  visible_to_customer: boolean
  shared_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Relations
  lead?: {
    full_name: string
    email: string
  }
  uploaded_by_user?: {
    full_name: string
  }
  signature_fields?: DocumentSignatureField[]
  signatures?: DocumentSignature[]
  share_links?: DocumentShareLink[]
}

export interface DocumentSignatureField {
  id: string
  document_id: string
  field_type: SignatureFieldType
  field_label: string
  page_number: number | null
  x_position: number | null
  y_position: number | null
  width: number | null
  height: number | null
  signer_role: SignerRole
  required: boolean
  sort_order: number
  created_at: string
}

export interface DocumentSignature {
  id: string
  document_id: string
  signature_field_id: string | null
  signer_name: string
  signer_email: string
  signer_role: SignerRole
  signature_type: SignatureFieldType
  signature_data: string  // Base64 PNG
  ip_address: string
  user_agent: string
  signed_at: string
  agreed_to_terms: boolean
  consent_text: string
  verification_method: VerificationMethod | null
  verification_token: string | null
  verified_at: string | null
  created_at: string
  
  // Relations
  signature_field?: DocumentSignatureField
}

export interface DocumentShareLink {
  id: string
  document_id: string
  share_token: string
  expires_at: string | null
  max_views: number | null
  view_count: number
  password_hash: string | null
  allow_download: boolean
  allow_signature: boolean
  created_by: string | null
  created_at: string
  last_viewed_at: string | null
  revoked_at: string | null
  
  // Relations
  document?: DocumentWithRelations
}

export interface DocumentView {
  id: string
  document_id: string
  share_link_id: string | null
  ip_address: string | null
  user_agent: string | null
  viewed_at: string
}

// Insert types (for creating new records)
export interface DocumentInsert {
  company_id: string
  lead_id: string
  document_type: DocumentType
  title: string
  description?: string | null
  file_url: string
  file_name: string
  file_size?: number | null
  mime_type?: string | null
  version?: number
  supersedes_id?: string | null
  requires_signature?: boolean
  signature_status?: SignatureStatus | null
  quote_id?: string | null
  invoice_id?: string | null
  uploaded_by?: string | null
  visible_to_customer?: boolean
}

export interface DocumentSignatureFieldInsert {
  document_id: string
  field_type: SignatureFieldType
  field_label: string
  page_number?: number | null
  x_position?: number | null
  y_position?: number | null
  width?: number | null
  height?: number | null
  signer_role: SignerRole
  required?: boolean
  sort_order?: number
}

export interface DocumentSignatureInsert {
  document_id: string
  signature_field_id?: string | null
  signer_name: string
  signer_email: string
  signer_role: SignerRole
  signature_type: SignatureFieldType
  signature_data: string
  ip_address: string
  user_agent: string
  consent_text: string
  agreed_to_terms?: boolean
  verification_method?: VerificationMethod | null
  verification_token?: string | null
}

export interface DocumentShareLinkInsert {
  document_id: string
  share_token: string
  expires_at?: string | null
  max_views?: number | null
  password_hash?: string | null
  allow_download?: boolean
  allow_signature?: boolean
  created_by?: string | null
}

// Update types
export interface DocumentUpdate {
  title?: string
  description?: string | null
  document_type?: DocumentType
  signature_status?: SignatureStatus | null
  visible_to_customer?: boolean
  shared_at?: string | null
}

export interface DocumentShareLinkUpdate {
  expires_at?: string | null
  max_views?: number | null
  revoked_at?: string | null
  last_viewed_at?: string | null
  view_count?: number
}

// Filter types for queries
export interface DocumentFilters {
  document_type?: DocumentType | DocumentType[]
  requires_signature?: boolean
  signature_status?: SignatureStatus
  visible_to_customer?: boolean
  quote_id?: string
}

// Constants for use throughout the app
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quote: 'Quote',
  contract: 'Contract',
  invoice: 'Invoice',
  photo: 'Photo',
  receipt: 'Receipt',
  permit: 'Permit',
  insurance: 'Insurance',
  warranty: 'Warranty',
  change_order: 'Change Order',
  completion: 'Certificate of Completion',
  other: 'Other',
}

export const SIGNATURE_STATUS_LABELS: Record<SignatureStatus, string> = {
  pending: 'Pending Signature',
  signed: 'Signed',
  declined: 'Declined',
  expired: 'Expired',
}

export const SIGNATURE_FIELD_TYPE_LABELS: Record<SignatureFieldType, string> = {
  signature: 'Signature',
  initial: 'Initial',
  date: 'Date',
  text: 'Text',
}

// Electronic Signature Consent Text (ESIGN Act compliance)
export const ELECTRONIC_SIGNATURE_CONSENT = `
By clicking "Submit Signatures" below, I agree to use electronic signatures and records 
in connection with this transaction. I understand that:

1. I am signing this document electronically, and my electronic signature has the same 
   legal effect as a handwritten signature.

2. I consent to conducting this transaction electronically and agree that electronic 
   records will have the same legal effect as paper records.

3. I may request a paper copy of the electronic record at any time.

4. I may withdraw my consent to use electronic signatures at any time by contacting 
   the company, though withdrawal will not affect the legal effectiveness of signatures 
   already provided.

5. My signature, IP address, timestamp, and device information will be recorded for 
   verification and legal purposes.

I confirm that I have read, understand, and agree to the terms and conditions outlined 
in this document.
`.trim()
