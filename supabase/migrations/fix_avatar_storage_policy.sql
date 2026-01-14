-- Fix avatar upload RLS policy for lead-photos bucket
-- Allow authenticated users to upload/update/delete their own avatars

-- Drop existing policies if they exist (in case we're re-running)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-photos' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (regexp_match(name, 'avatars/([^.]+)\.'))[1]
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-photos' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (regexp_match(name, 'avatars/([^.]+)\.'))[1]
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-photos' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (regexp_match(name, 'avatars/([^.]+)\.'))[1]
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'lead-photos' 
  AND (storage.foldername(name))[1] = 'avatars'
);
