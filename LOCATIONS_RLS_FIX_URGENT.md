# URGENT: Fix Locations Infinite Recursion Error

## Problem
The infinite recursion error persists because the old RLS policies weren't fully removed.

## Solution
Run the new aggressive fix migration that:
1. Temporarily disables RLS
2. Uses a DO block to drop ALL policies (no matter what they're named)
3. Re-enables RLS  
4. Creates clean, non-recursive policies

## Steps to Fix

### 1. Open Supabase Dashboard
- Go to: https://ofwbaxfxhoefbyfhgaph.supabase.co
- Click **SQL Editor** in the left sidebar

### 2. Run the Migration
- Copy the ENTIRE contents of: `supabase/migrations/20260107000003_aggressive_locations_rls_fix.sql`
- Paste into SQL Editor
- Click **Run**

### 3. Verify Fix Worked
After running, you should see output like:
```
NOTICE:  Dropped policy: old_policy_name_1
NOTICE:  Dropped policy: old_policy_name_2
...
```

Followed by a results table showing 4 new policies:
- locations_select_policy
- locations_insert_policy
- locations_update_policy
- locations_delete_policy

### 4. Test in App
1. Refresh browser (Ctrl+F5)
2. Go to Settings → Locations
3. Click Edit on a location
4. Select an office user
5. Set commission
6. Click "Update Location"
7. **Expected**: Success toast, NO errors

## Why This Works

The previous migration tried to drop policies by name, but:
- Some policies might have different names than expected
- Some policies might have quotes or special characters
- The migration didn't forcibly remove everything

This new migration uses a PostgreSQL DO block to:
- Query `pg_policies` table directly
- Loop through EVERY policy on the locations table
- Drop them one by one
- Then create fresh policies with known names

## Technical Details

### Old Problem (Recursive Policy Example)
```sql
-- BAD: This causes infinite recursion
CREATE POLICY "update_policy" ON locations
USING (
  id IN (
    SELECT location_id FROM locations  -- ❌ References itself!
    WHERE company_id = ...
  )
);
```

### New Solution (Non-Recursive)
```sql
-- GOOD: Only references users table
CREATE POLICY "locations_update_policy" ON locations  
USING (
  company_id IN (
    SELECT company_id FROM users  -- ✅ No self-reference
    WHERE id = auth.uid()
  )
);
```

## If This Still Doesn't Work

If you STILL get infinite recursion after running this migration, it means:

1. **Check for triggers**: There might be a database trigger causing recursion
   - Run: `SELECT * FROM pg_trigger WHERE tgrelid = 'locations'::regclass;`
   
2. **Check updated_at trigger**: The handle_updated_at trigger might be buggy
   - This is a common culprit
   
3. **Contact me**: Provide the full error output and I'll investigate deeper

## Files

- **New Migration**: `supabase/migrations/20260107000003_aggressive_locations_rls_fix.sql`
- **Old Migration** (didn't work): `supabase/migrations/20260107000002_fix_locations_rls_recursion.sql`
