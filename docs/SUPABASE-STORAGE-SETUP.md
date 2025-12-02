# Supabase Storage Bucket Setup

This document explains how to create and configure the `documents` storage bucket for the Ketterly e-signature and document management system.

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `documents`
   - **Public bucket**: ❌ **Unchecked** (files will use signed URLs for security)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: `application/pdf, image/jpeg, image/png, image/jpg, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

5. Click **Create bucket**

## Option 2: Via Supabase CLI

```bash
# In your project root
npx supabase storage create documents --public=false
```

## Storage Policies (RLS)

After creating the bucket, set up Row Level Security policies:

### Navigate to Storage > Policies in Dashboard

Or use SQL in the SQL Editor:

```sql
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
```

## Folder Structure

Files are organized by company and lead:

```
documents/
├── {company_id}/
│   ├── {lead_id}/
│   │   ├── {timestamp}_{filename}.pdf
│   │   ├── {timestamp}_{filename}.jpg
│   │   └── contract_{quote_number}.pdf
│   └── {another_lead_id}/
│       └── ...
└── {another_company_id}/
    └── ...
```

## Testing the Setup

After creating the bucket and policies, test with:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE name = 'documents';

-- Check if RLS is enabled on storage.objects
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check storage policies (should show 4 policies for documents bucket)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Simpler view of just policy names
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

## Troubleshooting

### Error: "new row violates row-level security policy"

- Make sure you're logged in with a user that has a `company_id`
- Check that the folder structure matches: `{company_id}/{lead_id}/{filename}`
- Verify RLS policies are active on `storage.objects`

### Files not uploading

- Check file size (must be < 50 MB)
- Verify MIME type is allowed
- Check browser console for errors
- Ensure user has valid session

### Can't view uploaded files

- Files are private by default - use signed URLs
- Check `getDocumentSignedUrl()` function in `lib/api/documents.ts`
- Verify user's company matches the file's company folder

## Next Steps

After setting up the storage bucket:

1. Run the database migration: `npx supabase db push`
2. Test file upload in the Files tab on a lead detail page
3. Verify files are stored in correct company/lead folders
4. Test download functionality
5. Test signature workflow with document share links

---

**Last Updated**: November 30, 2024
