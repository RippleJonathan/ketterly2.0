# Storage Setup Troubleshooting

## Issue Found

When running the query from `SUPABASE-STORAGE-SETUP.md`:
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'documents';
```

**Error**: `relation "storage.policies" does not exist`

## Root Cause

The table `storage.policies` doesn't exist in Supabase/PostgreSQL. Storage policies are stored in the PostgreSQL system catalog `pg_policies`, not in a dedicated `storage.policies` table.

## Solution

Use the correct PostgreSQL system catalog queries. See `supabase/verify_storage_setup.sql` for a complete verification script.

### Quick Fix - Correct Queries

```sql
-- ✅ CORRECT: Check if RLS is enabled on storage.objects
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- ✅ CORRECT: List storage policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

## Verification Steps

### 1. Run the Verification Script

Open **Supabase Dashboard → SQL Editor** and run the queries from:
```
supabase/verify_storage_setup.sql
```

Run each section **one at a time** and check the results.

### 2. Expected Results

#### Step 1: Bucket exists ✓
```
name: documents
public: false
file_size_limit_mb: 50
```
**✅ YOU HAVE THIS** - Your bucket is correctly configured!

#### Step 2: RLS enabled
```
rls_enabled: true
```
**❓ Need to verify** - Run the query to check

#### Step 3: Four policies exist
You should see 4 policies:
1. "Users can upload to their company folder" (INSERT)
2. "Users can view their company files" (SELECT)  
3. "Users can update their company files" (UPDATE)
4. "Users can delete their company files" (DELETE)

**❓ Need to verify** - Run the query to check

#### Step 6: User has company_id
```
id: <your-user-id>
email: <your-email>
company_id: <uuid> (NOT NULL!)
```
**❓ CRITICAL** - If company_id is NULL, uploads will fail!

## Common Issues

### Issue 1: No policies found
**Symptom**: Step 3 returns 0 rows

**Fix**: Run Step 5 in the verification script to create all 4 policies

### Issue 2: RLS not enabled
**Symptom**: Step 2 shows `rls_enabled: false`

**Fix**: Run this command:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### Issue 3: User has no company_id
**Symptom**: Step 6 shows `company_id: null`

**Fix**: You need to:
1. Sign up properly through the app's signup flow, OR
2. Manually assign a company_id:
```sql
UPDATE public.users 
SET company_id = '<your-company-id>'
WHERE id = auth.uid();
```

### Issue 4: Policies created but uploads still fail
**Check**:
- File path format: `{company_id}/{lead_id}/{filename}`
- File size < 50 MB
- File MIME type is allowed
- User is authenticated (session exists)

## Next Steps

After verifying all steps pass:

1. ✅ Bucket exists (CONFIRMED)
2. ⏳ RLS enabled on storage.objects (verify)
3. ⏳ 4 policies created (verify)
4. ⏳ User has valid company_id (verify)
5. ⏳ Test document upload in the app

Once all verification steps pass, try uploading a document through the Files tab!

## Files Updated

- ✅ `docs/SUPABASE-STORAGE-SETUP.md` - Fixed incorrect query
- ✅ `supabase/verify_storage_setup.sql` - Comprehensive verification script
- ✅ `docs/STORAGE-TROUBLESHOOTING.md` - This file

---

**Last Updated**: December 1, 2024
