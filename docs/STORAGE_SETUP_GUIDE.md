# Document Library Storage Setup

This guide walks through setting up Supabase Storage buckets for the document library system.

## Overview

We need two storage buckets:
1. **global-documents**: Platform-wide documents (managed by admins)
2. **company-documents**: Company-specific uploads (managed by users)

## Prerequisites

- Supabase project access (https://app.supabase.com)
- Project URL and service role key in `.env.local`

---

## Step 1: Create Storage Buckets

### 1. Go to Supabase Dashboard
- Navigate to: https://app.supabase.com
- Select your project
- Go to **Storage** in the left sidebar

### 2. Create `global-documents` Bucket

Click **New bucket** and configure:
- **Name**: `global-documents`
- **Public bucket**: ✅ **Enabled** (documents should be publicly accessible)
- **File size limit**: 10 MB
- **Allowed MIME types**: Leave empty (we'll validate in code)

### 3. Create `company-documents` Bucket

Click **New bucket** and configure:
- **Name**: `company-documents`
- **Public bucket**: ✅ **Enabled** (documents should be publicly accessible)
- **File size limit**: 10 MB
- **Allowed MIME types**: Leave empty (we'll validate in code)

---

## Step 2: Configure Storage Policies

For each bucket, we need Row Level Security (RLS) policies to control access.

### Global Documents Policies

Go to **Storage > global-documents > Policies**

**Policy 1: Public Read Access**
```sql
-- Name: Allow public downloads
-- Operation: SELECT
-- Policy definition:
CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'global-documents');
```

**⚠️ IMPORTANT: No Upload/Delete Policies for Global Documents**

Global documents are **platform-wide resources** managed by the platform owner (you). In a multi-tenant system, company admins should NOT be able to upload or delete global documents.

**Management Strategy:**
- Upload global documents directly via **Supabase Dashboard → Storage → global-documents**
- Or use the **Supabase Storage API** with your service role key (from scripts/admin tools)
- Or create a separate super-admin UI later (outside the main app)

**Why no policies?**
- Each company has their own admins
- `users.role = 'admin'` would allow ANY company admin to modify global docs
- Global docs are platform resources, not company resources
- They should be managed outside the normal app flow

**If you need programmatic upload later:**
You can add upload access via service role key in a separate admin script, or add a `is_platform_owner` boolean to users table and check that instead of just `role = 'admin'`.

### Company Documents Policies

Go to **Storage > company-documents > Policies**

**Policy 1: All users can view their company's documents**
```sql
-- Name: All users can view their company documents
-- Operation: SELECT
-- Policy definition:
CREATE POLICY "All users can view their company documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM users 
    WHERE id = auth.uid()
  )
);
```

**Policy 2: Company admins can upload to their company folder**
```sql
-- Name: Company admins can upload to their company folder
-- Operation: INSERT
-- Policy definition:
CREATE POLICY "Company admins can upload to their company folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM users 
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

**Policy 3: Company admins can delete their company's documents**
```sql
-- Name: Company admins can delete their company documents
-- Operation: DELETE
-- Policy definition:
CREATE POLICY "Company admins can delete their company documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM users 
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

**Note**: The `(storage.foldername(name))[1]` extracts the first folder from the path (which is the company_id).
File paths look like: `company_id/category/filename.pdf`

---

## Step 3: Verify Setup

### Test Global Documents Access

Run this in your browser console (while logged in):

```javascript
const { data, error } = await supabase.storage
  .from('global-documents')
  .list()

console.log('Global documents:', data, error)
```

### Test Company Documents Access

```javascript
const { data: user } = await supabase.auth.getUser()
const { data: userData } = await supabase
  .from('users')
  .select('company_id')
  .eq('id', user.user.id)
  .single()

const companyId = userData.company_id

// Test upload
const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
const { data, error } = await supabase.storage
  .from('company-documents')
  .upload(`${companyId}/contracts/test.txt`, testFile)

console.log('Upload result:', data, error)
```

---

## Step 4: Environment Variables

Ensure these are in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

---

## Troubleshooting

### "new row violates row-level security policy"
- Check that RLS policies are created correctly
- Verify user has correct company_id in users table
- Check that file path matches policy pattern: `company_id/category/filename.ext`

### "413 Payload Too Large"
- Check file size (must be < 10 MB)
- Verify bucket file size limit is set correctly

### "403 Forbidden" when uploading
- Ensure user is authenticated
- Check storage policies are created
- Verify path format: `company_id/category/filename.ext`

### Files not appearing in list
- Check bucket name is correct
- Verify public access is enabled
- Check database records are created (storage upload can succeed but DB insert fail)

---

## Next Steps

After completing this setup:
1. ✅ Run the database migration (if not done already)
2. ✅ Storage buckets configured
3. ⏳ Build upload UI components
4. ⏳ Test end-to-end upload flow

---

**Last Updated**: December 22, 2024
