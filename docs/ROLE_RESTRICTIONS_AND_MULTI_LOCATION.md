# Role Creation Restrictions & Multi-Location Access

**Updated**: December 30, 2024

## ✅ Changes Implemented

### 1. Role Creation Restrictions

**Problem**: Office users could create admin and other office users (security issue)

**Solution**: Role dropdown now filtered based on current user's role

```typescript
// Only admin/super_admin can create these roles:
- admin
- office

// Office users can create these roles:
- sales_manager
- sales
- production  
- marketing
```

**Implementation**:
- Updated `create-user-dialog.tsx` to check current user's role
- Role dropdown conditionally renders options
- Form description changes based on permissions

**Code**:
```typescript
const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
const canCreateAdmins = isAdmin
const canCreateOffice = isAdmin

// In SelectContent:
{canCreateAdmins && <SelectItem value="admin">Admin</SelectItem>}
{canCreateOffice && <SelectItem value="office">Office Staff</SelectItem>}
```

---

### 2. Multi-Location Access for Leads

**Problem**: Users assigned to multiple locations (like call center) couldn't see leads from all their locations

**Solution**: Updated leads filtering to accept location_id as array

**Changes**:
1. **Type Definition** (`lib/types/index.ts`):
```typescript
export type LeadFilters = {
  // ... other filters
  location_id?: string | string[] // Support single or multiple locations
}
```

2. **API Layer** (`lib/api/leads.ts`):
```typescript
// Multi-location filtering
if (filters?.location_id) {
  if (Array.isArray(filters.location_id)) {
    query = query.in('location_id', filters.location_id)
  } else {
    query = query.eq('location_id', filters.location_id)
  }
}
```

3. **Usage Example**:
```typescript
// Call center user assigned to Dallas, Houston, Austin
const { data: userLocations } = useUserLocations(userId)
const locationIds = userLocations.map(ul => ul.location_id)

// Fetch leads from ALL assigned locations
const { data: leads } = useLeads({ 
  location_id: locationIds // ['dallas-id', 'houston-id', 'austin-id']
})
```

---

## 📋 Updated Role Matrix

| Role | Can Create | Can Assign Locations | Can Manage Team | Sees Data |
|------|-----------|---------------------|----------------|-----------|
| **Admin/Super Admin** | ANY role | ✅ All locations | ✅ All users | All locations |
| **Office** | sales_manager, sales, production, marketing | ✅ Their locations | ✅ Their team | Their locations |
| **Sales Manager** | ❌ None | ❌ | ❌ | Their locations |
| **Sales/Production/Marketing** | ❌ None | ❌ | ❌ | Their locations |

---

## 🎯 Real-World Scenarios

### Scenario 1: Call Center Team (Multi-Location)

**Setup**:
- User: Sarah (Call Center Manager)
- Role: `sales_manager`
- Locations: Dallas, Houston, Austin (assigned via location_users)

**Result**:
- ✅ Sees leads from Dallas, Houston, AND Austin
- ✅ Can create leads for any of her assigned locations
- ✅ Lead list automatically filtered to show all 3 locations
- ❌ Cannot create users
- ❌ Cannot manage team

### Scenario 2: Dallas Office Manager

**Setup**:
- User: Mike (Dallas Manager)
- Role: `office`
- Locations: Dallas (assigned as location_admin)

**Result**:
- ✅ Sees only Dallas leads/users
- ✅ Can create users (sales, production, etc.) for Dallas
- ✅ Can manage Dallas team
- ❌ Cannot create admin or other office users
- ❌ Cannot see Houston or Austin data

### Scenario 3: Company Owner

**Setup**:
- User: You
- Role: `admin`
- Locations: None (not assigned)

**Result**:
- ✅ Sees ALL locations' data
- ✅ Can create ANY role (including admin/office)
- ✅ Can assign users to any location
- ✅ Full system access

---

## 🔧 How to Use

### For Multi-Location Users

When displaying data that should respect user's assigned locations:

```typescript
import { useUserLocations } from '@/lib/hooks/use-location-users'
import { useCurrentUser } from '@/lib/hooks/use-current-user'

function LeadsPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const { data: userLocations } = useUserLocations(user?.id)
  
  // Admins see all, others see only their locations
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const locationIds = isAdmin 
    ? undefined // Don't filter for admins
    : userLocations?.data?.map(ul => ul.location_id) || []
  
  const { data: leads } = useLeads({ 
    location_id: locationIds 
  })
  
  // Leads will show data from all assigned locations
}
```

### Testing Multi-Location Access

1. Create a test user:
   - Role: `sales` or `sales_manager`
   - Assign to multiple locations (Dallas, Houston)

2. Log in as that user

3. Go to Leads page

4. Verify: You see leads from BOTH Dallas AND Houston

---

## 🚨 Security Notes

1. **Role Creation**: Office users CANNOT escalate privileges by creating admin users
2. **Location Isolation**: RLS policies still enforce company_id isolation
3. **Multi-Location**: Users only see data from their ASSIGNED locations (not all company locations)
4. **Admin Bypass**: Admin/super_admin always bypass location restrictions

---

## ✅ Testing Checklist

- [ ] Admin can create any role (including admin/office)
- [ ] Office user cannot see admin/office options in dropdown
- [ ] Office user can create sales/production/marketing users
- [ ] Multi-location user sees leads from ALL assigned locations
- [ ] Single-location user sees only their location's leads
- [ ] Admin sees all leads regardless of location assignment

---

## 📝 Files Modified

1. `components/admin/users/create-user-dialog.tsx` - Role restriction logic
2. `lib/api/leads.ts` - Multi-location filtering
3. `lib/types/index.ts` - Added location_id to LeadFilters
4. `lib/hooks/use-location-admin.ts` - Office user location admin logic
5. `components/admin/sidebar.tsx` - Updated navigation for office users
6. `supabase/migrations/20241230000002_location_admin_user_creation.sql` - RLS policies

---

**Ready for testing!** 🚀
