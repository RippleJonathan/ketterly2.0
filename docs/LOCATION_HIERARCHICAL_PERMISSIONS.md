# Location-Based Hierarchical Permissions

**Status**: ✅ Implemented  
**Date**: December 30, 2024  
**Version**: 2.0.0 (Simplified)

## 🎯 UPDATE: System Simplified!

**New in v2.0:** Location roles are now **auto-derived** from company roles! No more confusing dropdowns.

See **[SIMPLIFIED_LOCATION_ASSIGNMENT.md](./SIMPLIFIED_LOCATION_ASSIGNMENT.md)** for the new simplified system.

**Quick Summary:**
- `office` → auto `location_admin`
- `sales_manager`/`production` → auto `manager`  
- `sales`/`marketing` → auto `member`
- Office users: Locations auto-assigned (hidden dropdown)
- Admin users: Can select location (auto-selects if only one)

---

## Overview

Ketterly now supports a **hierarchical permission model** for multi-location companies:

```
Company Owner (admin/super_admin/office)
  ├─ Can see ALL locations
  ├─ Can manage ALL users
  ├─ Can create locations
  └─ Full system access

Location Manager (location_admin role)
  ├─ Manages their assigned location(s) ONLY
  ├─ Can create/edit users for their location
  ├─ Sees only their location's team
  ├─ Cannot access company-wide settings
  └─ Can manage location-specific pricing/settings

Location Member (member/manager role)
  ├─ Regular employee at location
  ├─ Works leads/quotes for their location
  └─ No admin capabilities
```

---

## Architecture Changes

### 1. New Hooks

**`lib/hooks/use-location-admin.ts`**

Provides utilities to check if a user is a location administrator:

```typescript
// Check if user is location admin (not company admin)
const { isLocationAdmin, locations } = useIsLocationAdmin()

// Get managed locations for current user
const { isCompanyAdmin, isLocationAdmin, managedLocationIds } = useManagedLocations()
```

Key features:
- Distinguishes between company-wide admins and location-only admins
- Returns list of locations user can manage
- Used throughout the app for permission checks

### 2. Updated Components

**`components/admin/users/user-list.tsx`**

- **Location Filtering**: Location admins now see only users assigned to their managed locations
- **User Assignment**: Multi-location assignment UI integrated
- **Imports**: Added `useManagedLocations` and `useLocationUsers` hooks

```typescript
// Filter users for location managers
if (isLocationAdmin && managedLocationIds.length > 0) {
  const managedUserIds = new Set<string>()
  locationUsersQueries.forEach(query => {
    query.data?.data?.forEach((lu: any) => {
      managedUserIds.add(lu.user_id)
    })
  })
  users = users.filter(user => managedUserIds.has(user.id))
}
```

**`components/admin/users/create-user-dialog.tsx`**

- **Location Assignment**: New fields for assigning users to locations
- **Auto-Selection**: Location managers automatically assign to their location(s)
- **Auto-Assignment**: New users are assigned to selected location after creation
- **Role Selection**: Location role dropdown (member/manager/location_admin)

```typescript
// Auto-select location for single-location managers
location_id: isLocationAdmin && managedLocationIds.length === 1 
  ? managedLocationIds[0] 
  : 'none',

// After creating user, assign to location
if (data.location_id && data.location_id !== 'none' && result.data) {
  await assignUserToLocation.mutateAsync({
    user_id: result.data.id,
    location_id: data.location_id,
    location_role: data.location_role || 'member',
  })
}
```

**`components/admin/sidebar.tsx`**

- **Conditional Navigation**: Hides company-wide settings from location managers
- **Users Access**: Location admins can still see Users page to manage their team
- **Settings Hidden**: Locations, Commission Plans, Role Permissions hidden from location admins

```typescript
// Special case: Location admins can see Users page
const isUsersPage = item.href === '/admin/users'
const canSeeUsers = isUsersPage && (hasRole || isLocationAdmin)
```

### 3. Database Migrations

**`supabase/migrations/20241230000002_location_admin_user_creation.sql`**

Updated RLS policies on `users` table to allow location admins to manage their team:

**UPDATE Policy**: Location admins can update users in their managed locations
```sql
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (
    id = auth.uid() OR
    -- Company admins
    (company_id IN (...)) OR
    -- Location admins can update their team
    (
      id IN (
        SELECT DISTINCT lu.user_id
        FROM location_users lu
        WHERE lu.location_id IN (
          SELECT location_id 
          FROM location_users 
          WHERE user_id = auth.uid() AND location_role = 'location_admin'
        )
      )
    )
  );
```

**DELETE Policy**: Location admins can deactivate users in their managed locations
```sql
CREATE POLICY "Admins can delete company users"
  ON users FOR DELETE
  USING (
    -- Company admins OR
    (company_id IN (...)) OR
    -- Location admins can delete their team
    (
      id IN (
        SELECT DISTINCT lu.user_id FROM location_users lu
        WHERE lu.location_id IN (...)
      )
    )
  );
```

---

## Permission Matrix

| Action | Company Admin | Location Admin | Location Member |
|--------|--------------|----------------|-----------------|
| View all locations | ✅ | ❌ (only theirs) | ❌ (only theirs) |
| Create locations | ✅ | ❌ | ❌ |
| Manage location settings | ✅ | ✅ (theirs only) | ❌ |
| View all users | ✅ | ❌ (team only) | ❌ |
| Create users | ✅ | ✅ (assign to their location) | ❌ |
| Edit users | ✅ | ✅ (their team only) | ❌ |
| Deactivate users | ✅ | ✅ (their team only) | ❌ |
| View company settings | ✅ | ❌ | ❌ |
| Manage commission plans | ✅ | ❌ | ❌ |
| Manage role permissions | ✅ (admin only) | ❌ | ❌ |
| View their profile | ✅ | ✅ | ✅ |
| Create leads/quotes | ✅ | ✅ | ✅ |
| View dashboard | ✅ | ✅ | ✅ |

---

## Usage Guide

### For Company Owners

1. **Create Locations** (`/admin/settings/locations`)
   - Add all company branches
   - Set one as primary (used for company-wide operations)

2. **Assign Location Managers**
   - Go to Users page
   - Click "Manage Locations" on a user
   - Select location(s) and set role to "Location Admin"

3. **Location managers can now**:
   - Create users for their location
   - Manage their team
   - View/edit leads and quotes for their location

### For Location Managers

1. **Navigate to Users** (`/admin/users`)
   - You'll only see team members assigned to your location(s)

2. **Add New Team Member**
   - Click "Add User"
   - Fill in details
   - Location is auto-selected to your location
   - Choose location role (member/manager)

3. **Manage Existing Team**
   - Edit user details
   - Change permissions
   - Deactivate if needed

4. **Note**: You cannot:
   - See users from other locations
   - Access company-wide settings
   - Create new locations
   - Manage commission plans

### For Developers

**Check if user is location admin**:
```typescript
import { useManagedLocations } from '@/lib/hooks/use-location-admin'

function MyComponent() {
  const { isLocationAdmin, managedLocationIds } = useManagedLocations()
  
  if (isLocationAdmin) {
    // Show location-specific features
  }
}
```

**Filter data by managed locations**:
```typescript
const { managedLocationIds } = useManagedLocations()

// In your query
.in('location_id', managedLocationIds)
```

**Check permissions in server components**:
```typescript
const { data: { user } } = await supabase.auth.getUser()

const { data: locationRoles } = await supabase
  .from('location_users')
  .select('location_id, location_role')
  .eq('user_id', user.id)
  .eq('location_role', 'location_admin')

const isLocationAdmin = locationRoles.length > 0
const managedLocationIds = locationRoles.map(lr => lr.location_id)
```

---

## Implementation Checklist

- [x] Create `use-location-admin.ts` hook
- [x] Update `user-list.tsx` to filter by location
- [x] Update `create-user-dialog.tsx` with location assignment
- [x] Update `sidebar.tsx` to hide company settings
- [x] Create RLS policy migration
- [x] Create migration runner script
- [x] Write documentation

### Testing Checklist

- [ ] Create location_admin user
- [ ] Verify they can create users
- [ ] Verify they only see their team
- [ ] Verify sidebar hides company settings
- [ ] Verify company admins still see everything
- [ ] Test multi-location assignment
- [ ] Test location role changes

---

## Migration Instructions

### Run the Migration

```bash
node run-location-admin-migration.js
```

Or manually copy SQL from `supabase/migrations/20241230000002_location_admin_user_creation.sql` into Supabase Dashboard SQL Editor.

### Verify Migration

1. Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

2. Test location admin can update users:
```sql
-- As location admin user
UPDATE users SET full_name = 'Test Update' 
WHERE id = '<user_in_your_location>';
```

---

## Troubleshooting

### Location admin can't create users

**Symptom**: Permission denied when creating user  
**Solution**: Ensure user has `location_admin` role in `location_users` table

```sql
SELECT * FROM location_users WHERE user_id = '<user_id>';
```

### User sees all company users instead of just their team

**Symptom**: Location admin sees everyone  
**Solution**: Check if user has company-wide admin role

```sql
SELECT role FROM users WHERE id = '<user_id>';
-- If role is 'admin', 'super_admin', or 'office', they are company-wide admin
```

### Navigation shows company-wide settings

**Symptom**: Location admin sees Settings, Locations, Commission Plans  
**Solution**: Verify `useManagedLocations` hook returns correct values

```typescript
console.log({ isCompanyAdmin, isLocationAdmin, managedLocationIds })
// Should be: { isCompanyAdmin: false, isLocationAdmin: true, managedLocationIds: [...] }
```

---

## Future Enhancements

- [ ] Location-specific dashboard widgets
- [ ] Location-based lead assignment rules
- [ ] Location performance comparison reports
- [ ] Location-specific branding (logos, colors)
- [ ] Location manager notifications for team activity
- [ ] Bulk user import per location
- [ ] Location-based commission splits

---

## Related Documentation

- [Multi-Tenant Locations Feature](./docs/LOCATIONS_MULTI_TENANT.md)
- [Permissions System](./docs/PERMISSIONS_SYSTEM.md)
- [User Management](./docs/USER_MANAGEMENT.md)
- [RLS Policies](./docs/RLS_POLICIES.md)

---

**Questions or issues?** Check Supabase logs or review the implementation files listed above.
