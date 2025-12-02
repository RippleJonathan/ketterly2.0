-- =============================================
-- FIX STORAGE POLICIES - CLEANUP AND RECREATE
-- =============================================
-- You have duplicate policies. This script will clean them up
-- and create the correct 4 policies.
-- =============================================

-- =============================================
-- STEP 1: Drop all existing storage policies
-- =============================================
-- Run these one at a time to avoid errors if some don't exist

DROP POLICY IF EXISTS "Users can access their company PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their company files" ON storage.objects;


-- =============================================
-- STEP 2: Create the correct 4 policies
-- =============================================

-- Policy 1: Users can upload files to their company's folder
CREATE POLICY "Users can upload to their company folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy 2: Users can view their company's files
CREATE POLICY "Users can view their company files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy 3: Users can update their company's files
CREATE POLICY "Users can update their company files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy 4: Users can delete their company's files
CREATE POLICY "Users can delete their company files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );


-- =============================================
-- STEP 3: Verify you now have exactly 4 policies
-- =============================================
SELECT 
  policyname,
  cmd AS operation
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Expected result: Exactly 4 policies:
-- 1. "Users can delete their company files" (DELETE)
-- 2. "Users can update their company files" (UPDATE)
-- 3. "Users can upload to their company folder" (INSERT)
-- 4. "Users can view their company files" (SELECT)
