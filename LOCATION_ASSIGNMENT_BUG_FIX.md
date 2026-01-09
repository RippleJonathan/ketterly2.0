# Location Assignment Bug - Root Cause Analysis & Fix

## Problem Summary

When creating a new user from the Arizona office, the user is being incorrectly assigned to the **Texas branch** location instead of the **Arizona office** location. This affects:

1. Location auto-assignment on lead creation
2. Team member auto-assignment (sales rep, marketing rep)
3. User visibility and permissions

## Root Cause

The issue is in the user creation flow:

### Expected Behavior
1. Arizona office user creates a new user
2. System checks which locations the office user manages (via `location_users` table)
3. New user gets auto-assigned to the same location(s) as the creating user

### Actual Behavior
1. Arizona office user creates a new user
2. System checks `location_users` table for office user's locations
3. **BUG**: Office user has wrong location assigned (Texas instead of Arizona)
4. New user inherits the wrong location (Texas)

### Technical Flow

File: `components/admin/users/create-user-dialog.tsx`
```typescript
// Line 133-137
if (isAdmin) {
  // Admin selected explicitly
} else {
  // Office user: auto-assign to their managed locations
  locationsToAssign = managedLocationIds  // ← Gets Texas because office user is in Texas!
}
```

Hook: `lib/hooks/use-location-admin.ts`
```typescript
// Line 28-35 - Office users are location admins for their assigned locations
if (user.role === 'office') {
  const officeLocations = userLocations?.data || []
  return {
    isLocationAdmin: officeLocations.length > 0,
    locations: officeLocations.map((ul: any) => ul.location_id), // ← Returns Texas!
  }
}
```

## Data Corruption

### Current State (WRONG)
```
User: 336702f4-19df-415e-a5fc-a9ab33bb7a19 (Sales Rep)
Location: 18a6cddb-bde6-4ca0-9aab-2a5f1691ab16 (Texas branch)
Should be: bdf94cd4-c718-4e41-9f42-6edf9b3b54cc (Arizona office)
```

### Likely Cause
The **office user who created this sales user** is also assigned to the wrong location. This creates a chain reaction:
1. Office user incorrectly assigned to Texas
2. Office user creates new users
3. New users inherit Texas location
4. All Arizona users end up in Texas!

## Fix Strategy

### Step 1: Identify All Affected Users
Run query from `fix-location-assignments.sql` (Step 1) to find all users currently in Texas location.

### Step 2: Find the Office User
Run query from `fix-location-assignments.sql` (Step 2) to identify which office user is assigning people to Texas.

### Step 3: Move Users to Correct Location
Update the `location_users` table to move all Arizona users from Texas to Arizona:

```sql
UPDATE location_users 
SET location_id = 'bdf94cd4-c718-4e41-9f42-6edf9b3b54cc'  -- Arizona
WHERE location_id = '18a6cddb-bde6-4ca0-9aab-2a5f1691ab16'  -- Texas
  AND user_id IN (
    '336702f4-19df-415e-a5fc-a9ab33bb7a19',  -- Sales user
    -- Add other affected user IDs
  );
```

### Step 4: Verify Fix
- Check that all users are now in correct location
- Test creating a new user from Arizona office
- Verify new user gets Arizona location
- Test lead creation with location auto-fill
- Test team assignment auto-fill

## Prevention

### Code Review Needed
The user creation logic is working as designed - the problem is bad data got into `location_users`. Possible causes:
1. Manual user creation via SQL
2. Initial seed data with wrong location IDs
3. Migration that assigned default location incorrectly
4. Admin user manually moving office user to wrong location

### Recommendation
Add validation in user creation:
- When creating a user, log which location(s) they're being assigned to
- Add confirmation in UI: "Creating user for Arizona office - assign to Arizona location?"
- Add data integrity checks in migrations

## Files Involved

1. **components/admin/users/create-user-dialog.tsx** - User creation form
2. **lib/hooks/use-location-admin.ts** - Location management hook
3. **lib/hooks/use-location-users.ts** - User-location assignments
4. **app/api/users/create/route.ts** - User creation API (has separate location assignment)
5. **Database: location_users table** - Stores user-location assignments

## Next Steps

1. ✅ Created diagnostic SQL (`fix-location-assignments.sql`)
2. ⏳ Run Step 1 query to identify all affected users
3. ⏳ Run Step 2 query to find the office user causing the issue
4. ⏳ Run Step 3 UPDATE to fix all affected users
5. ⏳ Run Step 4 verification to confirm fix
6. ⏳ Test user creation flow
7. ⏳ Test lead creation auto-assignment
8. ⏳ Document how the bad data originally got into the system

## Testing Checklist

After fix:
- [ ] Office user shows correct location in their profile
- [ ] Creating new user from Arizona office assigns Arizona location
- [ ] Creating lead as sales user auto-fills Arizona location
- [ ] Team assignment shows sales/marketing reps from Arizona location only
- [ ] Commission calculations use the new per-role commission rates
- [ ] Location picker works correctly for admins
- [ ] Office users cannot select locations (auto-assigned)
