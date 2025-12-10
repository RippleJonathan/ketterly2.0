-- =============================================
-- FIX DOCUMENT UPLOAD RLS POLICIES
-- This fixes the "new row violates row-level security policy" error
-- when uploading invoices or other documents
-- =============================================

-- =============================================
-- STEP 1: Check current storage policies
-- =============================================
SELECT 
  policyname,
  cmd AS operation,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- =============================================
-- STEP 2: Drop existing policies and recreate
-- =============================================

-- Drop all existing storage.objects policies
DROP POLICY IF EXISTS "Users can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their company PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- =============================================
-- STEP 3: Create new simplified policies
-- =============================================

-- Policy 1: INSERT - Users can upload files to documents bucket
-- Path format: companyId/leadId/filename
-- We check if the first folder (companyId) matches the user's company
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 2: SELECT - Users can view their company's files
CREATE POLICY "Authenticated users can view their documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 3: UPDATE - Users can update their company's files
CREATE POLICY "Authenticated users can update their documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 4: DELETE - Users can delete their company's files
CREATE POLICY "Authenticated users can delete their documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- =============================================
-- STEP 4: Verify the new policies
-- =============================================
SELECT 
  policyname,
  cmd AS operation
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- =============================================
-- STEP 5: Also verify documents table policies
-- =============================================
SELECT 
  policyname,
  cmd AS operation
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'documents'
ORDER BY policyname;

-- =============================================
-- NOTES:
-- =============================================
-- - File path format: companyId/leadId/filename
-- - storage.foldername(name)[1] extracts the first folder (companyId)
-- - We cast to UUID for proper comparison
-- - Auth check ensures user is logged in
-- - Company check ensures user can only access their company's files
