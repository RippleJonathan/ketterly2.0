-- =============================================
-- FIX LEAD-PHOTOS STORAGE POLICIES
-- =============================================
-- This fixes the "new row violates row-level security policy" error
-- when uploading photos to the lead-photos bucket
-- =============================================

-- =============================================
-- STEP 1: Drop all existing lead-photos policies
-- =============================================

DROP POLICY IF EXISTS "Users can view their company's lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company's photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company's photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete lead photos" ON storage.objects;

-- =============================================
-- STEP 2: Create the correct 4 policies for lead-photos bucket
-- =============================================

-- Policy 1: Users can upload photos to their company's folder
CREATE POLICY "lead_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lead-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy 2: Users can view their company's photos
CREATE POLICY "lead_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lead-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy 3: Users can update their company's photos
CREATE POLICY "lead_photos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'lead-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy 4: Users can delete their company's photos
CREATE POLICY "lead_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lead-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- =============================================
-- STEP 3: Verify you now have exactly 4 policies for lead-photos
-- =============================================
SELECT 
  policyname,
  cmd AS operation
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'lead_photos%'
ORDER BY policyname;

-- Expected result: Exactly 4 policies:
-- 1. "lead_photos_delete" (DELETE)
-- 2. "lead_photos_insert" (INSERT)
-- 3. "lead_photos_select" (SELECT)
-- 4. "lead_photos_update" (UPDATE)
