# Location-Specific PDFs and Supplier Improvements

**Date**: January 27, 2026  
**Status**: Planning & Implementation

## Overview

This document outlines the changes needed to make PDFs location-specific and add location filtering + document storage for suppliers.

---

## 1. Invoice PDF - Location Specific

### Current State
- Invoice PDF generation in `lib/utils/generate-invoice-pdf.ts`
- Uses company-level information from `invoice.companies`
- Does NOT use location-specific information

### Changes Needed

**Database**:
- Invoices already have `location_id` column ✅
- Locations table has all necessary info ✅

**Code Changes**:
1. Update invoice query to include location data
2. Pass location info to PDF generator
3. Use location address/contact info instead of company-wide

**Files to Modify**:
- `app/api/invoices/[id]/pdf/route.ts` - Add location join to query
- `app/api/invoices/[id]/download-pdf/route.ts` - Add location join
- `app/api/invoices/[id]/send-email/route.ts` - Add location join
- `lib/utils/generate-invoice-pdf.ts` - Accept location parameter, use location data

**Implementation**:
```typescript
// Update query to include location
const { data: invoice } = await supabase
  .from('customer_invoices')
  .select(`
    *,
    companies(*),
    leads(*),
    locations(*),  // ADD THIS
    customer_invoice_line_items(*)
  `)
  .eq('id', invoiceId)
  .single()

// Pass to PDF generator
const html = generateInvoicePDF(invoice as any, invoice.locations)

// Update PDF generator signature
export function generateInvoicePDF(invoice: any, location?: any): string {
  // Use location data if available, fall back to company
  const businessName = location?.name || invoice.companies?.name
  const businessAddress = location?.address || invoice.companies?.address
  const businessPhone = location?.phone || invoice.companies?.contact_phone
  const businessEmail = location?.email || invoice.companies?.contact_email
  // ...
}
```

---

## 2. Material Order PDF - Location Specific

### Current State
- Material order PDFs generated in `lib/utils/pdf-generator.ts`
- Uses `PurchaseOrderPDF` component
- Currently defaults to main location

### Changes Needed

**Database**:
- `material_orders` table already has `location_id` ✅

**Code Changes**:
1. Ensure location data is fetched with material order
2. Pass location to PDF component
3. Update PDF template to use location info

**Files to Modify**:
- Wherever material order PDFs are generated (need to search usage)
- `components/admin/pdf/purchase-order-pdf.tsx` - Update to use location
- `lib/utils/pdf-generator.ts` - Ensure location is passed

---

## 3. Work Order PDF - Location Specific

### Current State
- Work order PDFs generated in `lib/utils/pdf-generator.ts`
- Uses `WorkOrderPDF` component
- Currently defaults to original location

### Changes Needed

**Database**:
- `work_orders` table already has `location_id` ✅

**Code Changes**:
1. Ensure location data is fetched with work order
2. Pass location to PDF component
3. Update PDF template to use location info

**Files to Modify**:
- `components/admin/pdf/work-order-pdf.tsx` - Update to use location
- `lib/utils/pdf-generator.ts` - Ensure location is passed

---

## 4. Suppliers - Location Filtering

### Current State
- Suppliers table exists in database
- NO location_id column currently ❌
- Suppliers are company-wide

### Changes Needed

**Database Migration**:
```sql
-- Add location filtering to suppliers
ALTER TABLE public.suppliers
ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_suppliers_location_id ON suppliers(location_id);

-- Comment
COMMENT ON COLUMN suppliers.location_id IS 'Location this supplier is associated with. If null, supplier is available to all locations.';
```

**TypeScript Updates**:
```typescript
// lib/types/suppliers.ts
export interface Supplier {
  // ... existing fields
  location_id: string | null  // ADD THIS
}

export interface SupplierInsert {
  // ... existing fields
  location_id?: string | null  // ADD THIS
}

export interface SupplierFilters {
  type?: SupplierType
  is_active?: boolean
  search?: string
  location_id?: string  // ADD THIS
}
```

**API Updates**:
```typescript
// lib/api/suppliers.ts - Update getSuppliers
export async function getSuppliers(
  companyId: string,
  filters?: SupplierFilters
): Promise<ApiResponse<Supplier[]>> {
  // ... existing code
  
  // ADD: Filter by location
  if (filters?.location_id) {
    query = query.or(`location_id.eq.${filters.location_id},location_id.is.null`)
  }
  
  // ...
}
```

**UI Updates**:
- `components/admin/settings/suppliers-settings.tsx` - Add location dropdown to form
- Material order forms - Filter suppliers by current lead's location
- Work order forms - Filter suppliers by current lead's location

---

## 5. Supplier Document Storage

### Current State
- NO document storage for suppliers ❌

### Changes Needed

**Database Migration**:
```sql
-- Create supplier_documents table
CREATE TABLE public.supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Document info
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,  -- 'w9', 'master_agreement', 'insurance', 'license', 'other'
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Metadata
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_supplier_documents_supplier_id ON supplier_documents(supplier_id);
CREATE INDEX idx_supplier_documents_company_id ON supplier_documents(company_id);
CREATE INDEX idx_supplier_documents_type ON supplier_documents(document_type);

-- RLS
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their company's supplier documents"
  ON supplier_documents
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER set_supplier_documents_updated_at
  BEFORE UPDATE ON supplier_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Storage Bucket**:
```sql
-- Create storage bucket for supplier documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', false);

-- Storage policies
CREATE POLICY "Users can upload supplier documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their company's supplier documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'supplier-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's supplier documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'supplier-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM users WHERE id = auth.uid()
    )
  );
```

**TypeScript Types**:
```typescript
// lib/types/supplier-documents.ts
export type SupplierDocumentType = 'w9' | 'master_agreement' | 'insurance' | 'license' | 'other'

export interface SupplierDocument {
  id: string
  supplier_id: string
  company_id: string
  name: string
  description: string | null
  document_type: SupplierDocumentType
  file_url: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SupplierDocumentInsert {
  supplier_id: string
  company_id: string
  name: string
  description?: string
  document_type: SupplierDocumentType
  file_url: string
  file_path: string
  file_size?: number
  mime_type?: string
  uploaded_by?: string
}
```

**API Functions**:
```typescript
// lib/api/supplier-documents.ts
export async function getSupplierDocuments(supplierId: string): Promise<ApiResponse<SupplierDocument[]>>
export async function uploadSupplierDocument(file: File, supplierId: string, documentType: SupplierDocumentType): Promise<ApiResponse<SupplierDocument>>
export async function deleteSupplierDocument(documentId: string): Promise<ApiResponse<void>>
export async function downloadSupplierDocument(documentId: string): Promise<Blob>
```

**UI Components**:
- Supplier detail page - Add "Documents" tab
- Document upload form
- Document list with download/delete options
- Document type dropdown (W-9, Master Agreement, Insurance, License, Other)

---

## Implementation Order

1. **Phase 1: Suppliers Location Filtering** (Quick Win)
   - Migration to add `location_id` to suppliers
   - Update types and API
   - Update supplier form to include location
   - Update material/work order forms to filter by location

2. **Phase 2: Supplier Documents** (New Feature)
   - Migration to create `supplier_documents` table
   - Create storage bucket and policies
   - Create types and API functions
   - Build UI for upload/view/delete documents

3. **Phase 3: Invoice PDF Location** (Important)
   - Update all invoice PDF API routes to join locations
   - Modify `generateInvoicePDF` to accept and use location data
   - Test with different locations

4. **Phase 4: Material/Work Order PDFs Location** (Final Polish)
   - Update material order PDF generation
   - Update work order PDF generation
   - Test with different locations

---

## Testing Checklist

- [ ] Create supplier assigned to Location A
- [ ] Verify supplier only shows for jobs in Location A
- [ ] Create supplier with no location (company-wide)
- [ ] Verify company-wide supplier shows for all locations
- [ ] Upload W-9 for supplier
- [ ] Upload Master Agreement for supplier
- [ ] Download documents
- [ ] Delete document
- [ ] Generate invoice PDF from Location A job - verify Location A info shows
- [ ] Generate invoice PDF from Location B job - verify Location B info shows
- [ ] Generate material order PDF - verify correct location info
- [ ] Generate work order PDF - verify correct location info

---

## Files to Create/Modify

### New Files:
- `supabase/migrations/20260127000003_add_supplier_location.sql`
- `supabase/migrations/20260127000004_create_supplier_documents.sql`
- `lib/types/supplier-documents.ts`
- `lib/api/supplier-documents.ts`
- `components/admin/suppliers/supplier-documents.tsx`
- `components/admin/suppliers/upload-document-dialog.tsx`

### Files to Modify:
- `lib/types/suppliers.ts` - Add location_id
- `lib/api/suppliers.ts` - Add location filtering
- `components/admin/settings/suppliers-settings.tsx` - Add location dropdown
- `app/api/invoices/[id]/pdf/route.ts` - Add location join
- `app/api/invoices/[id]/download-pdf/route.ts` - Add location join
- `app/api/invoices/[id]/send-email/route.ts` - Add location join
- `lib/utils/generate-invoice-pdf.ts` - Use location data
- Material order PDF generation files
- Work order PDF generation files

---

## Next Steps

Would you like me to:
1. Start with Phase 1 (Suppliers Location Filtering)?
2. Start with Phase 2 (Supplier Documents)?
3. Start with Phase 3 (Invoice PDF Location)?
4. Or work on all phases simultaneously?

Let me know which priority makes most sense for your workflow!
