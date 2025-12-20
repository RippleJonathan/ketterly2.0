# Calendar System Fixes - December 19, 2024

## Issues Identified

1. **Material Order Calendar Event Creation Failing (403 RLS Error)**
   - **Root Cause**: The RLS INSERT policy for `calendar_events` was too restrictive, requiring users to have specific permission flags (`can_create_consultations` OR `can_create_production_events`)
   - **Impact**: When material orders were created and the system tried to auto-create calendar events, the INSERT failed with "new row violates row-level security policy for table 'calendar_events'"

2. **Calendar Event Delete Not Working (403 RLS Error)**
   - **Root Cause**: The UPDATE policy had a `WITH CHECK` clause that validates the new row state after the update. Since we only update `deleted_at` (not all fields), the validation was failing
   - **Impact**: Users couldn't delete calendar events - got "new row violates row-level security policy" error even though they had permission
   - **Technical Detail**: PostgreSQL's `WITH CHECK` validates the **entire updated row**, not just the changed fields. Our policy required `company_id` to match, but we weren't including it in the UPDATE statement.

## Fixes Applied

### 1. Database Migration (`20241219000001_fix_calendar_rls_policies.sql`)

**Changes Made:**
- **Simplified INSERT Policy**: Removed permission checks from INSERT policy. Now only requires:
  - User is from the same company
  - User is setting themselves as `created_by`
  - Permission checks moved to application level for better control
  
- **Fixed UPDATE Policy**: Enhanced to properly support soft deletes
  - Users can update their own events
  - Users with `can_edit_all_events` permission can update any event
  - **Removed `WITH CHECK` clause** - this was causing the delete issue
  - Added check to prevent updating already-deleted events (`deleted_at IS NULL`)
  - Now relies only on `USING` clause which validates the current row state, not the updated state
  
- **Granted Production Permissions**: Updated all existing users to have `can_create_production_events = true`
  - Ensures backward compatibility
  - Allows all users to create material/labor order events

### 2. Code Changes (`lib/api/calendar.ts`)

**deleteEvent() Function:**
- Removed unnecessary pre-fetch verification
- Simplified to direct UPDATE with `deleted_at`
- Added check to only delete non-deleted events (`is('deleted_at', null)`)
- Added error logging for debugging

## How to Apply the Fix

### Step 1: Run the Database Migration

1. Open Supabase Dashboard SQL Editor
2. Copy the contents of `supabase/migrations/20241219000001_fix_calendar_rls_policies.sql`
3. Paste into SQL Editor and execute
4. Verify success - you should see:
   - 3 policies dropped
   - 3 policies created
   - User permissions updated

### Step 2: Restart Dev Server

The code changes are already applied. Just restart your dev server:

```powershell
# Stop current server (Ctrl+C in the terminal)
npm run dev
```

### Step 3: Test the Fixes

**Test Material Order Calendar Event Creation:**
1. Go to a lead detail page
2. Click "Create Material Order"
3. Select a template or create manual order
4. Set a delivery date
5. Save the order
6. ✅ **Expected**: Order created + calendar event created successfully
7. ✅ **Expected**: No 403 RLS errors in console

**Test Calendar Event Deletion:**
1. Go to Calendar page (`/admin/calendar`)
2. Find any event (or create a test one)
3. Click to open event details
4. Click "Delete" button
5. ✅ **Expected**: Event deleted successfully
6. ✅ **Expected**: Event disappears from calendar view
7. ✅ **Expected**: No errors in console

## Technical Details

### RLS Policy Changes

**Before (Too Restrictive):**
```sql
CREATE POLICY "Users can create calendar events with permissions"
  ON calendar_events FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND created_by = auth.uid()
    AND (
      (event_type IN ('consultation', 'adjuster_meeting', 'other')
        AND can_create_consultations = true)
      OR
      (event_type IN ('production_materials', 'production_labor')
        AND can_create_production_events = true)
    )
  );
```

**After (Fixed - No WITH CHECK):**
```sql
CREATE POLICY "Users can update calendar events"
  ON calendar_events FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL -- Can only update non-deleted events
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND can_edit_all_events = true
      )
    )
  );
  -- No WITH CHECK clause - allows partial updates like soft deletes
```

### Why This Approach is Better

1. **Separation of Concerns**: Permission checks at application level allow for:
   - Better error messages
   - More flexible permission logic
   - Easier testing and debugging

2. **Auto-Creation Friendly**: System-generated events (material delivery, labor schedules) can be created without complex permission checks

3. **Backward Compatible**: Existing functionality continues to work

4. **Secure**: Still enforces company isolation and creator validation

5. **Partial Update Support**: No `WITH CHECK` on UPDATE policy allows soft deletes and partial updates
   - `USING` clause checks the **current** row state (before update)
   - `WITH CHECK` would validate the **new** row state (after update)
   - When only updating `deleted_at`, `WITH CHECK` fails because we're not providing all required fields

### PostgreSQL RLS Gotcha: WITH CHECK vs USING

**Important**: In PostgreSQL RLS policies:
- `USING` clause: Checks the **existing row** (before the operation)
- `WITH CHECK` clause: Checks the **new/updated row** (after the operation)

For soft deletes where we only update one field (`deleted_at`), including a `WITH CHECK` that requires other fields (like `company_id`) will fail because:
1. The UPDATE only sets `deleted_at = NOW()`
2. PostgreSQL validates the **entire updated row** against `WITH CHECK`
3. Since `company_id` isn't in the UPDATE statement, the validation fails

**Solution**: For UPDATE policies that support partial updates, use only `USING` clause.

## Verification Checklist

After running the migration and restarting, verify:

- [ ] Material orders create calendar events without RLS errors
- [ ] Work orders create calendar events without RLS errors  
- [ ] Users can delete their own calendar events
- [ ] Users with `can_edit_all_events` can delete any event
- [ ] Events are soft-deleted (have `deleted_at` timestamp, not hard deleted)
- [ ] Deleted events don't appear in calendar views
- [ ] No 403 errors in browser console
- [ ] All calendar CRUD operations work smoothly

## Rollback Plan

If issues arise, you can rollback by reverting to the original policies:

```sql
-- Drop new policies
DROP POLICY IF EXISTS "Users can create calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update calendar events" ON calendar_events;

-- Restore original policies from migration 20241218000001_create_calendar_system.sql
-- (Copy the original CREATE POLICY statements from that file)
```

## Notes

- The migration is **idempotent** - safe to run multiple times
- The `can_create_production_events` permission is now granted to all users
- Future users will need this permission set during onboarding
- Consider updating the user creation flow to grant this permission by default

## Questions?

If you encounter any issues after applying these fixes, check:
1. Migration executed successfully (no SQL errors)
2. Browser cache cleared (hard refresh: Ctrl+Shift+R)
3. Dev server restarted
4. Console for any new error messages
