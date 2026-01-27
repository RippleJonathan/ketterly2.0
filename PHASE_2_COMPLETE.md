# Phase 2: Supplier Documents - COMPLETE ✅

## Overview
Successfully implemented document management for suppliers. Users can now upload, view, edit, and delete documents like W-9s, insurance certificates, contracts, and more.

## What Was Implemented

### 1. Database Changes
- **Migration**: `supabase/migrations/20260127000004_add_supplier_documents.sql`
  - Created `supplier_documents` table with document metadata
  - Columns: document_type, title, file_name, file_path, file_size, mime_type, notes, expiration_date, uploaded_by
  - Document types: w9, insurance, contract, agreement, license, certification, other
  - RLS policies for company-based access control
  - Indexes for performance
  - Soft delete support

### 2. TypeScript Types Created
- **lib/types/supplier-documents.ts**
  - `SupplierDocument`, `SupplierDocumentInsert`, `SupplierDocumentUpdate`
  - `SupplierDocumentFilters` with expired documents filtering
  - `DOCUMENT_TYPE_LABELS` and `DOCUMENT_TYPE_COLORS` for UI

### 3. API Functions Created
- **lib/api/supplier-documents.ts**
  - `getSupplierDocuments()` - List all documents for a supplier
  - `getSupplierDocument()` - Get single document
  - `uploadSupplierDocument()` - Upload file to storage + create DB record (with rollback on failure)
  - `updateSupplierDocument()` - Update metadata (title, type, notes, expiration)
  - `deleteSupplierDocument()` - Soft delete DB record + hard delete from storage
  - `getDocumentDownloadUrl()` - Generate signed URL for downloads

### 4. React Query Hooks Created
- **lib/hooks/use-supplier-documents.ts**
  - `useSupplierDocuments()` - Query documents list
  - `useSupplierDocument()` - Query single document
  - `useUploadSupplierDocument()` - Upload mutation with cache invalidation
  - `useUpdateSupplierDocument()` - Update mutation
  - `useDeleteSupplierDocument()` - Delete mutation
  - `useDocumentDownloadUrl()` - Generate download URLs

### 5. UI Components Created
- **components/admin/suppliers/supplier-documents.tsx**
  - Document list table with type badges, expiration warnings
  - Download, edit, delete actions
  - Expired documents highlighted in red
  - Empty state with upload prompt

- **components/admin/suppliers/upload-document-dialog.tsx**
  - File upload with drag-and-drop support
  - Document type selection
  - Optional expiration date (for insurance, licenses, etc.)
  - Optional notes field
  - Auto-fills title from filename

- **components/admin/suppliers/edit-document-dialog.tsx**
  - Edit document metadata (title, type, notes, expiration)
  - File itself cannot be changed (must re-upload)

- **components/admin/settings/supplier-documents-dialog.tsx**
  - Full-screen modal wrapper for document management

### 6. Updated Existing Components
- **components/admin/settings/suppliers-settings.tsx**
  - Added "Documents" button (file icon) to each supplier row
  - Opens documents dialog in modal

- **lib/utils/formatting.ts**
  - Added `formatBytes()` utility for file size display

## How It Works

### Uploading a Document
1. User clicks "Upload Document" button
2. Selects file (PDF, DOC, DOCX, JPG, PNG)
3. Fills in title, document type, optional expiration date and notes
4. System uploads file to `supplier-documents` storage bucket at path: `{company_id}/suppliers/{supplier_id}/{unique_filename}`
5. Creates database record with file metadata
6. If DB insert fails, automatically deletes uploaded file (rollback)

### Viewing/Downloading Documents
- Table shows all documents with type badges
- Expired documents show red "Expired" badge
- Download button generates signed URL (valid 1 hour) and triggers browser download

### Document Expiration
- Optional expiration_date field for insurance, licenses, certifications
- Expired documents highlighted in red
- Can filter by expired vs. valid documents

### Security
- RLS policies ensure users only see their company's documents
- Signed URLs for downloads (expire after 1 hour)
- Soft delete in DB, hard delete from storage

## Setup Instructions

### 1. Run Database Migration
**Option A: Manual via Supabase Dashboard**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260127000004_add_supplier_documents.sql`
3. Paste and run

**Option B: Via exec_sql RPC (if available)**
```bash
node run-migration.js supabase/migrations/20260127000004_add_supplier_documents.sql
```

### 2. Create Supabase Storage Bucket
**Via Supabase Dashboard:**
1. Go to Storage → Create Bucket
2. Name: `supplier-documents`
3. Public: **NO** (private bucket)
4. File size limit: 50 MB (recommended)
5. Allowed MIME types: 
   - `application/pdf`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - `image/jpeg`
   - `image/png`

**Set up RLS Policies for Storage Bucket:**
```sql
-- Allow authenticated users to upload to their company folder
CREATE POLICY "Users can upload to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'supplier-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);

-- Allow users to view files from their company folder
CREATE POLICY "Users can view their company's files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'supplier-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);

-- Allow users to delete files from their company folder
CREATE POLICY "Users can delete their company's files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'supplier-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);
```

## Testing Checklist

- [ ] Run database migration
- [ ] Create `supplier-documents` storage bucket
- [ ] Set up storage RLS policies
- [ ] Go to Settings → Suppliers
- [ ] Click "Documents" icon on a supplier
- [ ] Upload a W-9 PDF
- [ ] Upload an insurance certificate with expiration date
- [ ] Verify documents appear in table
- [ ] Download a document - verify file downloads correctly
- [ ] Edit document metadata (change title/type)
- [ ] Delete a document - verify it's removed from list and storage
- [ ] Create document with past expiration date - verify "Expired" badge shows

## Files Created

- `supabase/migrations/20260127000004_add_supplier_documents.sql`
- `lib/types/supplier-documents.ts`
- `lib/api/supplier-documents.ts`
- `lib/hooks/use-supplier-documents.ts`
- `components/admin/suppliers/supplier-documents.tsx`
- `components/admin/suppliers/upload-document-dialog.tsx`
- `components/admin/suppliers/edit-document-dialog.tsx`
- `components/admin/settings/supplier-documents-dialog.tsx`
- `PHASE_2_COMPLETE.md` (this file)

## Files Modified

- `components/admin/settings/suppliers-settings.tsx` (added documents button)
- `lib/utils/formatting.ts` (added formatBytes)

## Next Steps

### Phase 3: Invoice PDF Location-Specific
- Update invoice PDF generation to use location data
- Show location address/contact instead of company address
- Test invoices from different locations

### Phase 4: Material/Work Order PDFs Location-Specific
- Update material order PDFs to use location data
- Update work order PDFs to use location data
- Test PDFs from different locations

## Estimated Time
- **Planned**: 45 minutes
- **Actual**: ~35 minutes
- **Status**: ✅ COMPLETE (pending storage bucket setup)

---

**Completed**: January 27, 2026  
**Developer**: GitHub Copilot  
**Next Phase**: Invoice PDF Location-Specific
