// Supplier document types

export type SupplierDocumentType = 
  | 'w9'
  | 'insurance'
  | 'contract'
  | 'agreement'
  | 'license'
  | 'certification'
  | 'other'

export interface SupplierDocument {
  id: string
  company_id: string
  supplier_id: string
  
  // Document details
  document_type: SupplierDocumentType
  title: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  
  // Metadata
  notes: string | null
  expiration_date: string | null
  uploaded_by: string | null
  
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SupplierDocumentInsert {
  company_id: string
  supplier_id: string
  document_type: SupplierDocumentType
  title: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  notes?: string | null
  expiration_date?: string | null
  uploaded_by?: string | null
}

export interface SupplierDocumentUpdate {
  title?: string
  document_type?: SupplierDocumentType
  notes?: string | null
  expiration_date?: string | null
}

export interface SupplierDocumentFilters {
  supplier_id?: string
  document_type?: SupplierDocumentType
  expired?: boolean // Filter by expiration_date < today
}

export const DOCUMENT_TYPE_LABELS: Record<SupplierDocumentType, string> = {
  w9: 'W-9 Form',
  insurance: 'Insurance Certificate',
  contract: 'Contract',
  agreement: 'Agreement',
  license: 'License',
  certification: 'Certification',
  other: 'Other',
}

export const DOCUMENT_TYPE_COLORS: Record<SupplierDocumentType, string> = {
  w9: 'bg-blue-100 text-blue-700',
  insurance: 'bg-green-100 text-green-700',
  contract: 'bg-purple-100 text-purple-700',
  agreement: 'bg-orange-100 text-orange-700',
  license: 'bg-cyan-100 text-cyan-700',
  certification: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
}
