# Storage Setup - Current Status & Next Steps

## Current Status

### ✅ What's Working
1. **Bucket Created**: `documents` bucket exists with correct settings
2. **RLS Enabled**: Row Level Security is enabled on `storage.objects`
3. **Policies Exist**: You have storage policies (though duplicated)

### ⚠️ Issues Found

#### Issue 1: Duplicate Policies (9 instead of 4)
**What happened**: Policies were created multiple times, possibly from:
- Running the SQL from the docs multiple times
- Different policy names for similar purposes
- Mix of old and new policies

**Current policies** (from your query results):
- Users can access their company PDFs (ALL)
- Users can delete documents (DELETE)
- Users can delete their company files (DELETE) ← Correct one
- Users can update documents (UPDATE)
- Users can update their company files (UPDATE) ← Correct one
- Users can upload documents (INSERT)
- Users can upload to their company folder (INSERT) ← Correct one
- Users can view documents (SELECT)
- Users can view their company files (SELECT) ← Correct one

**Impact**: Having duplicate policies won't break things, but it's messy and could cause confusion.

#### Issue 2: auth.uid() Returns No Rows
**What happened**: When you ran:
```sql
SELECT * FROM public.users WHERE id = auth.uid();
```
It returned no rows.

**Possible causes**:
1. You're using the **SQL Editor** in Supabase Dashboard, which runs as a service role (not as your logged-in user)
2. The `auth.uid()` function only works in the context of an authenticated request from your app
3. You need to check your user differently in the SQL editor

**Why this matters**: This doesn't mean your user doesn't exist or doesn't have a company_id. It just means we need to check it a different way.

## 🎯 Next Steps - Run These Scripts

### Step 1: Clean Up Duplicate Policies
Run `supabase/fix_storage_policies.sql` which will:
1. Drop all 9 existing policies
2. Create the correct 4 policies
3. Verify you have exactly 4 policies

**Run this now in Supabase SQL Editor**

### Step 2: Verify Your User Has company_id
Run `supabase/check_user_company.sql` which will:
1. List all users with their companies
2. Check if ANY users are missing company_id
3. Provide queries to fix missing company_id

**Important**: Look for YOUR email in the results!

### Step 3: Expected Results After Fixes

#### After fix_storage_policies.sql:
```
✓ 4 policies exactly:
  - Users can delete their company files (DELETE)
  - Users can update their company files (UPDATE)
  - Users can upload to their company folder (INSERT)
  - Users can view their company files (SELECT)
```

#### After check_user_company.sql:
```
✓ Your user row shows:
  - email: your@email.com
  - company_id: abc123... (UUID, NOT NULL)
  - company_name: Ripple Roofing & Construction (or your company name)
```

## Testing Document Upload

Once both fixes are complete, test document upload:

1. **Log into your app** (not SQL editor)
2. **Navigate to a lead detail page**
3. **Go to Files tab**
4. **Try uploading a document**

### What Should Happen:
1. File uploads to: `documents/{company_id}/{lead_id}/{timestamp}_{filename}`
2. Document record created in `public.documents` table
3. Document appears in the Files tab table
4. You can view/download the document

### If Upload Fails - Check:
1. **Browser Console** - Look for specific error message
2. **Network Tab** - Check the failed request details
3. **File Size** - Must be < 50 MB
4. **File Type** - Must be allowed MIME type
5. **Authentication** - Make sure you're logged in

## Why auth.uid() Didn't Work

The Supabase SQL Editor runs queries as the **service role** (admin), not as your authenticated user. This is why `auth.uid()` returns NULL in the SQL editor.

**When will auth.uid() work?**
- ✅ In RLS policies (when your app makes requests)
- ✅ In functions called from your app
- ❌ In SQL Editor (runs as service role)
- ❌ In migrations (runs during deployment)

**How RLS policies work in your app:**
When your Next.js app makes a request to Supabase:
1. User is logged in → has session token
2. Request includes session token
3. Supabase evaluates RLS policies using that token
4. `auth.uid()` returns the logged-in user's ID
5. Policy checks if user's company_id matches folder structure
6. Access granted or denied based on policy

## Files Created

1. **`supabase/fix_storage_policies.sql`** - Clean up duplicate policies
2. **`supabase/check_user_company.sql`** - Verify user has company_id
3. **`docs/STORAGE-STATUS.md`** - This status document

## Summary

**Your storage bucket is 95% ready!** You just need to:

1. ✅ Clean up duplicate policies (run fix_storage_policies.sql)
2. ✅ Verify your user has company_id (run check_user_company.sql)
3. ✅ Test upload in the app

The fact that policies exist (even duplicated) and RLS is enabled means uploads will likely work once you clean things up!

---

**Status**: Ready to fix and test
**Last Updated**: December 1, 2024
