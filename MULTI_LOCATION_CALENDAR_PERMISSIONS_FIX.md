# Multi-Location Calendar & Permissions Fix

## Date
January 2025

## Issues Fixed

### 1. Calendar Events Not Showing for Location Users ✅
**Problem**: Calendar events created for specific locations weren't showing up, even for users assigned to those locations. Admins couldn't see events across all locations.

**Root Cause**: Calendar API had no location-based filtering - all users either saw all events or none.

**Solution Implemented**:
- Added `location_id` field to `EventFilters` type
- Modified `getEvents()` API to include `location_id` in lead selection
- Added client-side location filtering in API layer
- Updated `useEvents()` hook to automatically apply location filtering:
  - **Admin/Super Admin**: See ALL events across all locations (no filter)
  - **Office/Sales/Production/Other roles**: See only events from their assigned location

**Files Changed**:
- `lib/types/calendar.ts`: Added `location_id` to EventFilters and CalendarEventWithRelations
- `lib/api/calendar.ts`: Added location_id to lead query, added location filtering logic
- `lib/hooks/use-calendar.ts`: Auto-apply location filter based on user role

### 2. Office Managers Can't Access Locations Page ✅
**Problem**: Office managers needed to access the Locations page to update location-specific supplier pricing, but the page was restricted to admin/super_admin only.

**Solution**: 
- Added `'office'` role to Locations nav item in sidebar
- Filtered locations page to show only assigned location for office users
- Hid create/delete/set-primary actions for office users
- Office users can only edit their assigned location's pricing

**Files Changed**:
- `components/admin/sidebar.tsx`: Line 107 - Added 'office' to roles array for Locations page
- `app/(admin)/admin/settings/locations/page.tsx`: Added role-based filtering and permissions

### 3. Users Page Permission Improvement ✅
**Problem**: Users page permission check had complex logic that wasn't evaluating correctly for office role

**Solution**: Simplified permission check logic to properly evaluate `can_view_users` permission (which office role has)

**Files Changed**:
- `components/admin/sidebar.tsx`: Line 133 - Simplified canSee logic to properly check hasPermission === true

## How It Works Now

### Calendar Event Visibility
```typescript
// Admin or Super Admin
if (user.role === 'admin' || user.role === 'super_admin') {
  // No location filter applied → sees ALL company events
}

// Office, Sales, Production, or other location-specific roles
else if (user.location_id) {
  // Filter events by user's location_id
  // Only shows events where lead.location_id matches user.location_id
}
```

### Sidebar Navigation Access

**Locations Page**:
- **Roles Allowed**: admin, super_admin, office
- **Admin/Super Admin**: See all locations, can create/delete/set primary
- **Office Role**: See only their assigned location, can only edit pricing (no create/delete)
- **Use Case**: Office managers manage location-specific supplier pricing

**Users Page**:
- **Permission Required**: `can_view_users`
- **Roles with Permission**: admin, super_admin, office, and others as configured
- **Use Case**: Office managers can view and manage users at their location

**Other Settings Pages** (unchanged):
- Settings, Commission Plans, Role Permissions remain admin/super_admin only

## Testing Checklist

### Calendar Testing
- [ ] Log in as **super_admin**
  - [ ] Create events in multiple locations
  - [ ] Verify you see ALL events from all locations
- [ ] Log in as **office user** (Arizona location)
  - [ ] Verify you only see Arizona location events
  - [ ] Create new event - verify it appears
- [ ] Log in as **sales user** (Texas location)
  - [ ] Verify you only see Texas location events
  - [ ] Don't see Arizona events

### Permissions Testing
- [ ] Log in as **office manager**
  - [ ] Verify "Locations" appears in Settings section of sidebar
  - [ ] Click Locations → verify can access page
  - [ ] Verify only see YOUR assigned location (not all locations)
  - [ ] Verify "Add Location" button NOT visible
  - [ ] Click menu on location card → verify NO "Delete" or "Set as Primary" options
  - [ ] Click "Edit" → update location-specific pricing → verify saves correctly
  - [ ] Verify "Users" appears in sidebar
  - [ ] Click Users → verify can access page
  - [ ] Verify can view and manage users

## Database Schema Notes

### location_id Flow
1. User has `location_id` field (their assigned location)
2. Lead has `location_id` field (where project is located)
3. Calendar event has `lead_id` (links to lead)
4. Query joins: `calendar_events → leads → location_id`
5. Filter compares: `lead.location_id === user.location_id`

### No Direct location_id on Events
Calendar events don't have a direct `location_id` column. They inherit location context through their associated lead. This is correct - events are always tied to a customer/lead, and the lead has the location.

## Future Enhancements

### 1. Location Page Detail View (Already Scoped Out)
The location page already has the filtering in place. Future enhancement could add tabs for:
- Material Pricing (supplier price overrides)
- Labor Rates (location-specific labor costs)
- Team Members (users assigned to location)

### 2. Event Creation Location Validation
When creating events, validate that users can only create events for leads in their location:
```typescript
// Before creating event
if (user.role !== 'admin' && user.role !== 'super_admin') {
  if (lead.location_id !== user.location_id) {
    throw new Error('Cannot create events for leads outside your location')
  }
}
```

### 3. Multi-Location Admin Role
Consider creating a "location_admin" role that can manage multiple specific locations (not just one).

## Related Documentation
- Location-specific pricing system: See previous implementation docs
- Permission system: `docs/PERMISSIONS_SYSTEM.md`
- User roles: `lib/types/users.ts`

## Completion Status
✅ All three issues resolved and ready for testing
