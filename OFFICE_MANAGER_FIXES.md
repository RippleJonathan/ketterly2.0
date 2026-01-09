# Office Manager Commission - Bug Fixes

## Issues Fixed

### 1. ✅ Select.Item Empty String Error - FIXED IN CODE
- **Issue**: Radix UI Select.Item cannot have empty string value
- **Fix**: Removed empty string fallback, using proper defaults
- **Files Changed**:
  - `components/admin/locations/location-form.tsx` - Set default value for commission_type Select

### 2. ✅ Controlled/Uncontrolled Select Warning - FIXED IN CODE
- **Issue**: Select switching from controlled to uncontrolled
- **Fix**: Always provide a default value for commission_type
- **Files Changed**:
  - `components/admin/locations/location-form.tsx` - Use `value={field.value || 'percentage'}`

### 3. ✅ Supabase Foreign Key Ambiguity - FIXED IN CODE
- **Issue**: PGRST201 error - Multiple foreign keys between location_users and users
- **Fix**: Changed query to use column name instead of foreign key name
- **Files Changed**:
  - `lib/api/location-users.ts` - Use `users:user_id(...)` instead of `users!location_users_user_id_fkey(...)`

### 4. ✅ Office Manager Not Saving - FIXED IN CODE
- **Issue**: Office manager data only saved when explicitly provided
- **Fix**: Always call setOfficeManager mutation with proper defaults
- **Files Changed**:
  - `app/(admin)/admin/settings/locations/page.tsx` - Always update office manager on location edit

### 5. ❌ Infinite Recursion in Locations RLS - REQUIRES DATABASE MIGRATION
- **Issue**: PostgreSQL error 42P17 - "infinite recursion detected in policy for relation locations"
- **Cause**: RLS policy on locations table references itself, creating a circular dependency
- **Fix**: Need to update RLS policies to only reference users table

## 🚨 ACTION REQUIRED: Fix Infinite Recursion Error

The locations table has an RLS policy that's causing infinite recursion. You need to run a database migration:

### Option 1: Manual Migration (RECOMMENDED)
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of: `supabase/migrations/20260107000002_fix_locations_rls_recursion.sql`
3. Paste into SQL Editor and click "Run"

### Option 2: Try Automated Script
```bash
node run-locations-rls-fix.js
```
(May not work if exec_sql RPC function doesn't exist)

### What the Migration Does:
- Drops ALL existing RLS policies on locations table
- Creates clean, non-recursive policies:
  - `locations_select_policy` - Users can view their company's locations
  - `locations_insert_policy` - Users can create locations in their company
  - `locations_update_policy` - Admins can update their company's locations
  - `locations_delete_policy` - Admins can delete their company's locations

### Why This Fixes It:
The old policies likely had a pattern like:
```sql
-- BAD: This creates recursion
WHERE company_id IN (
  SELECT company_id FROM locations WHERE user_id = auth.uid()
)
```

New policies reference ONLY the users table:
```sql
-- GOOD: No recursion
WHERE company_id IN (
  SELECT company_id FROM users WHERE id = auth.uid()
)
```

## Testing After Fixes

1. Refresh your browser (Ctrl+F5)
2. Go to Settings → Locations
3. Click "Edit" on a location
4. Try selecting an office user
5. Enable commission and set a rate
6. Click "Update Location"
7. Verify:
   - No console errors
   - Success toast appears
   - Location detail page shows office manager with commission badge
   - No infinite recursion error

## Files Modified

### Code Changes (Already Applied):
- ✅ `components/admin/locations/location-form.tsx`
- ✅ `lib/api/location-users.ts`
- ✅ `app/(admin)/admin/settings/locations/page.tsx`

### Database Migration (User Must Run):
- 📄 `supabase/migrations/20260107000002_fix_locations_rls_recursion.sql`

## Expected Behavior After All Fixes:

1. **Create/Edit Location**:
   - Select office user from dropdown
   - Toggle commission enabled
   - Choose percentage or flat amount
   - Enter rate/amount
   - Click Save
   
2. **Result**:
   - ✅ No console errors
   - ✅ Success toast
   - ✅ Office manager saved to location_users table
   - ✅ Location detail page shows office manager card
   - ✅ Badge displays commission info (e.g., "3% Commission" or "$100 per job")

3. **Auto-Commission**:
   - When lead created at this location
   - autoCreateCommission() reads location_users
   - Creates commission record for office manager
   - Commission calculated based on type (percentage/flat)

## Debugging

If office manager still not showing after migration:

```javascript
// Check location_users table
const { data } = await supabase
  .from('location_users')
  .select('*, users(*)')
  .eq('location_id', 'YOUR_LOCATION_ID')
  .eq('commission_enabled', true)

console.log('Office manager data:', data)
```

If still seeing infinite recursion:
1. Check Supabase Dashboard → Authentication → Policies → locations
2. Verify no policy references locations table in WHERE clause
3. All policies should only reference users table
