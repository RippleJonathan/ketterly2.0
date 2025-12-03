-- Storage bucket for lead photos
-- Run this in Supabase SQL Editor to set up the lead-photos bucket

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-photos', 'lead-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can view their company's lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company's photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company's photos" ON storage.objects;

-- Storage policies for lead-photos bucket

-- Policy: Users can view photos from their company's leads
CREATE POLICY "Users can view their company's lead photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lead-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM public.users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can upload photos to their company's folder
CREATE POLICY "Users can upload to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lead-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM public.users
    WHERE id = auth.uid()
  )
);

-- Policy: Users can update/delete photos from their company's folder
CREATE POLICY "Users can update their company's photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lead-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM public.users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company's photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lead-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM public.users
    WHERE id = auth.uid()
  )
);
