-- =============================================
-- VERIFY STORAGE BUCKET AND POLICIES SETUP
-- =============================================
-- This script helps verify that the 'documents' storage bucket
-- and its RLS policies are correctly configured.
--
-- Run each section separately in Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: Verify bucket exists
-- =============================================
SELECT 
  name,
  public,
  file_size_limit / 1024 / 1024 AS file_size_limit_mb,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'documents';

-- Expected result: 1 row showing:
-- - name: documents
-- - public: false
-- - file_size_limit_mb: 50
-- - allowed_mime_types: ["application/pdf", "image/jpeg", "image/png", ...]


-- =============================================
-- STEP 2: Check if RLS is enabled on storage.objects
-- =============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Expected result: rls_enabled should be TRUE
-- If FALSE, run: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- =============================================
-- STEP 3: List all storage policies
-- =============================================
SELECT 
  policyname,
  cmd AS operation,
  roles,
  CASE 
    WHEN cmd = 'SELECT' THEN 'View files'
    WHEN cmd = 'INSERT' THEN 'Upload files'
    WHEN cmd = 'UPDATE' THEN 'Update files'
    WHEN cmd = 'DELETE' THEN 'Delete files'
    ELSE cmd
  END AS description
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Expected result: 4 policies for documents bucket:
-- 1. "Users can upload to their company folder" (INSERT)
-- 2. "Users can view their company files" (SELECT)
-- 3. "Users can update their company files" (UPDATE)
-- 4. "Users can delete their company files" (DELETE)


-- =============================================
-- STEP 4: Detailed policy view (for debugging)
-- =============================================
SELECT 
  policyname,
  cmd,
  qual::text AS using_clause,
  with_check::text AS with_check_clause
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;


-- =============================================
-- STEP 5: If policies are missing, create them
-- =============================================
-- Only run this section if STEP 3 shows fewer than 4 policies

-- First, enable RLS if not enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
-- STEP 6: Verify your user has a company_id
-- =============================================
-- This checks that your current user can upload files
SELECT 
  id,
  email,
  full_name,
  company_id,
  role
FROM public.users 
WHERE id = auth.uid();

-- Expected result: Should show your user with a valid company_id (UUID)
-- If company_id is NULL, you won't be able to upload files!


-- =============================================
-- STEP 7: Test policy with expected folder path
-- =============================================
-- Replace {YOUR_COMPANY_ID} with actual company_id from STEP 6
-- Replace {YOUR_LEAD_ID} with an actual lead_id from your database

-- Example folder path that should work:
-- 'abc123-company-uuid/def456-lead-uuid/1234567890_file.pdf'

SELECT 
  (storage.foldername('{YOUR_COMPANY_ID}/{YOUR_LEAD_ID}/test.pdf'))[1] AS first_folder,
  '{YOUR_COMPANY_ID}' AS expected_company_id,
  CASE 
    WHEN (storage.foldername('{YOUR_COMPANY_ID}/{YOUR_LEAD_ID}/test.pdf'))[1] = '{YOUR_COMPANY_ID}' 
    THEN 'MATCH ✓'
    ELSE 'NO MATCH ✗'
  END AS folder_test;

-- Expected result: first_folder should match expected_company_id


-- =============================================
-- FINAL CHECKLIST
-- =============================================
/*
✓ Bucket 'documents' exists and is private (public = false)
✓ RLS is enabled on storage.objects
✓ 4 policies exist (INSERT, SELECT, UPDATE, DELETE)
✓ Current user has a valid company_id
✓ Folder path format is correct: {company_id}/{lead_id}/{filename}

If all checks pass, document upload should work!
*/
