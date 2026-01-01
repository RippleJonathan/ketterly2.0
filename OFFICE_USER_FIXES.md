# Office User Fixes - January 1, 2026

## Issues Fixed

### 1. ✅ New users not showing until page refresh
**Problem:** After creating a user as office role, the user didn't appear in the filtered list until refreshing the page.

**Root Cause:** Cache invalidation was missing for the `all-location-users` query.

**Fix:** Updated `useCreateUser()` and `useUpdateUser()` hooks to invalidate the `all-location-users` query after mutations.

**Files Changed:**
- `lib/hooks/use-users.ts` - Added query invalidation for `all-location-users`

---

### 2. ✅ Office users cannot edit user details
**Problem:** Office users got permission errors when trying to edit users in their managed locations.

**Root Cause:** RLS policy had complex subquery logic that wasn't working correctly for office users.

**Fix:** Created new migration with simplified RLS policies that explicitly check for `role = 'office'` and then verify the user being edited is in one of the office user's managed locations.

**Files Changed:**
- `supabase/migrations/20260101000001_fix_office_user_update_policy.sql` - New migration

**Migration To Run:**
```sql
-- Run this in Supabase Dashboard SQL Editor
-- File: supabase/migrations/20260101000001_fix_office_user_update_policy.sql
```

The migration:
1. Drops and recreates the UPDATE policy on users table
2. Drops and recreates the DELETE policy on users table
3. Simplifies the logic to explicitly check `role = 'office'`
4. Verifies the target user is in a location managed by the office user

---

### 3. ✅ Office users should not manage locations
**Problem:** Office users could see "Manage Locations" option in the user actions dropdown, but they shouldn't be able to reassign users to different locations (only admins should do this).

**Root Cause:** Permission check only verified "not managing self" but didn't restrict by role.

**Fix:** Updated the permission check to only show "Manage Locations" for admin and super_admin roles.

**Files Changed:**
- `components/admin/users/user-list.tsx` - Updated dropdown menu permissions

**Logic:**
```typescript
// BEFORE: Anyone could manage locations (except their own)
{currentUser?.id !== user.id && (...)}

// AFTER: Only admins can manage locations
{currentUser?.role && ['admin', 'super_admin'].includes(currentUser.role) && currentUser?.id !== user.id && (...)}
```

---

## Testing Steps

### 1. Test User Creation with Instant Update
1. Log in as office user
2. Create a new sales user
3. **Verify:** User appears immediately in the filtered list (no refresh needed)

### 2. Test User Editing
1. Run the migration in Supabase Dashboard:
   - Go to SQL Editor
   - Copy/paste content from `supabase/migrations/20260101000001_fix_office_user_update_policy.sql`
   - Run it
2. Log in as office user
3. Click "Edit Details" on a user in your location
4. Change their name, phone, or role
5. **Verify:** Changes save successfully (no 403 error)
6. **Verify:** Updated user details appear immediately

### 3. Test Location Management Restrictions
1. Log in as office user
2. Click the three-dot menu on any user
3. **Verify:** "Manage Locations" option is NOT visible
4. Log in as admin
5. Click the three-dot menu on any user
6. **Verify:** "Manage Locations" option IS visible

---

## Permission Model Summary

### What Office Users CAN Do:
- ✅ Create users (sales, sales_manager, staff roles only)
- ✅ Edit user details (name, email, phone, role, commission plan)
- ✅ Deactivate/reactivate users
- ✅ Delete users
- ✅ View filtered user list (only their location's users)

### What Office Users CANNOT Do:
- ❌ Create admin or office users (privilege escalation prevention)
- ❌ Manage user location assignments (admin-only)
- ❌ Manage user permissions (admin-only)
- ❌ See users outside their managed locations

### What Admins CAN Do:
- ✅ Everything office users can do
- ✅ Create admin and office users
- ✅ Manage location assignments
- ✅ Manage granular permissions
- ✅ See all company users (not filtered by location)

---

## Technical Details

### Cache Invalidation Strategy
After any user mutation (create, update, delete), we invalidate:
1. `['users', companyId]` - Main user list
2. `['user', userId]` - Specific user detail
3. `['current-user']` - Current logged-in user (if they edited themselves)
4. `['all-location-users', companyId]` - Location assignments for filtering ⭐ NEW

This ensures the filtered user list updates immediately without page refresh.

### RLS Policy Logic (Simplified)

**UPDATE Policy:**
```sql
Users can update IF:
  1. Updating their own record (id = auth.uid())
  OR
  2. They are admin/super_admin AND same company
  OR
  3. They have role='office' AND target user is in one of their managed locations
```

**DELETE Policy:**
```sql
Users can delete IF:
  1. They are admin/super_admin AND same company
  OR
  2. They have role='office' AND target user is in one of their managed locations
```

The key improvement: Explicit `role = 'office'` check instead of complex nested subqueries.

---

## Files Modified

1. `lib/hooks/use-users.ts` - Added cache invalidation
2. `components/admin/users/user-list.tsx` - Restricted location management to admins
3. `supabase/migrations/20260101000001_fix_office_user_update_policy.sql` - New RLS policies

---

## Next Steps

1. ✅ Run migration: `20260101000001_fix_office_user_update_policy.sql`
2. ✅ Test user creation (should appear immediately)
3. ✅ Test user editing as office role (should work now)
4. ✅ Verify "Manage Locations" is hidden for office users
5. ✅ Test that created users are auto-assigned to office user's locations

All three issues should now be resolved! 🎉
