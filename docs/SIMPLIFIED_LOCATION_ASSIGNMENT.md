# Simplified Location Assignment System

**Updated**: December 30, 2024  
**Status**: ✅ Implemented

## 🎯 Changes Summary

**Removed confusing two-role system, now ONE role auto-determines location permissions**

### Before (Confusing)
- Company role: `office`
- Location role: `location_admin` ← manually selected
- Problem: Why do I need to set TWO roles?

### After (Simple)
- Company role: `office`
- Location role: `location_admin` ← automatically derived
- Result: Set once, works everywhere!

---

## 📋 Auto-Derived Location Roles

| Company Role | → Auto Location Role | Powers at Location |
|-------------|---------------------|-------------------|
| `office` | `location_admin` | Full location management (create users, settings) |
| `sales_manager` | `manager` | Team lead, coordinate work |
| `production` | `manager` | Team lead, coordinate work |
| `sales` | `member` | Regular employee, work leads/quotes |
| `marketing` | `member` | Regular employee, work leads/quotes |
| `admin`/`super_admin` | N/A | Bypass all restrictions, see everything |

**No more dropdowns to select location role!** It's automatic based on company role.

---

## 🔧 New User Creation Flow

### When Admin Creates User

1. **Select company role** (admin, office, sales, etc.)
2. **Select location** (or auto-selects if only one location exists)
3. ✅ **Location role auto-assigned** based on company role
4. Done!

**Example:**
```
Create user: Mike
Company role: office
Location: Dallas

Result: Mike is automatically location_admin at Dallas
```

### When Office Creates User

1. **Select company role** (sales_manager, sales, production, marketing)
   - ❌ Cannot create admin or other office users
2. **Location is hidden** - auto-assigned to office user's location(s)
3. ✅ **Location role auto-assigned** based on company role
4. Done!

**Example:**
```
Sarah (office user at Dallas) creates user: John
John's company role: sales
Location selector: Hidden (not shown to Sarah)

Result: John is automatically assigned to Dallas as member
```

---

## 🎯 Key Rules

### Rule 1: Auto-Select Location When Only One Exists
```
Company has 1 location: "Main Office"
Admin creates user → Location auto-selected to "Main Office"
```

### Rule 2: Office Users Don't Select Locations
```
Sarah (office at Dallas) creates user
→ New user automatically assigned to Dallas
→ No location dropdown shown
→ Info message: "ℹ️ New user will be automatically assigned to your location(s): Dallas"
```

### Rule 3: Admin Can Change Locations Later
```
Admin → Users → Click user → "Manage Locations"
→ Can add/remove locations
→ Location role still auto-derived from company role
```

### Rule 4: Location Role Updates with Company Role
```
User starts as: sales (location role: member)
Admin changes to: office (location role becomes: location_admin)
```

---

## 📝 Implementation Details

### 1. New Utility File

**`lib/utils/location-roles.ts`**

```typescript
// Auto-derive location role from company role
getLocationRoleFromCompanyRole(companyRole: UserRole): LocationRole

// Get description of what role can do
getLocationRoleDescription(companyRole: UserRole): string
```

### 2. Updated Components

**`components/admin/users/create-user-dialog.tsx`**
- ❌ Removed location_role dropdown
- ✅ Auto-derives location_role from company role
- ✅ Hides location selector for office users
- ✅ Auto-selects location when only one exists
- ✅ Shows info message for office users about auto-assignment

**`components/admin/users/user-location-assignments.tsx`**
- ❌ Removed location_role dropdown
- ✅ Auto-derives location_role from company role
- ✅ Shows auto-assigned role with explanation
- ✅ Displays: "💡 Based on company role: office"

### 3. Form Schema Changes

**Before:**
```typescript
location_id: z.string().optional()
location_role: z.enum(['member', 'manager', 'location_admin']).optional()
```

**After:**
```typescript
location_id: z.string().optional()
// location_role removed - auto-derived
```

---

## 🎨 UI Changes

### Create User Dialog (Admin)

```
┌─────────────────────────────────┐
│ Add New User                    │
├─────────────────────────────────┤
│ Name: [____________]            │
│ Email: [____________]           │
│ Role: [Office Staff  ▼]         │
│                                 │
│ ─────────────────────────────── │
│ Assign to Location (Optional)   │
│ Location: [Dallas        ▼]     │
│ ℹ Auto-selected (only one)      │
│                                 │
│ Location role: location_admin   │
│ (auto-assigned based on role)   │
│                                 │
│           [Cancel] [Create User]│
└─────────────────────────────────┘
```

### Create User Dialog (Office User)

```
┌─────────────────────────────────┐
│ Add New User                    │
├─────────────────────────────────┤
│ Name: [____________]            │
│ Email: [____________]           │
│ Role: [Sales Rep     ▼]         │
│   (Only: sales, production,     │
│    marketing, sales_manager)    │
│                                 │
│ ─────────────────────────────── │
│ ℹ️ New user will be             │
│ automatically assigned to your  │
│ location(s): Dallas             │
│                                 │
│           [Cancel] [Create User]│
└─────────────────────────────────┘
```

### Manage Locations Dialog

```
┌─────────────────────────────────┐
│ Assign to Location              │
├─────────────────────────────────┤
│ Location: [Houston       ▼]     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Auto-Assigned Role          │ │
│ │ Manager                     │ │
│ │ Team lead (coordinate work, │ │
│ │ no admin access)            │ │
│ │                             │ │
│ │ 💡 Based on company role:   │ │
│ │    sales_manager            │ │
│ └─────────────────────────────┘ │
│                                 │
│           [Cancel]    [Assign]  │
└─────────────────────────────────┘
```

---

## ✅ Testing Checklist

### Admin User Creation
- [ ] Create user with role=office → auto location role is location_admin
- [ ] Create user with role=sales → auto location role is member
- [ ] Create user when only 1 location exists → auto-selects location
- [ ] Create user with multiple locations → can choose location

### Office User Creation
- [ ] Office user creates sales user → auto-assigned to office's location
- [ ] Office user creates sales_manager → auto-assigned as manager
- [ ] Office user doesn't see location dropdown
- [ ] Office user sees info message about auto-assignment

### Manage Locations
- [ ] Admin adds location to user → role auto-derived
- [ ] Dialog shows auto-assigned role with explanation
- [ ] Dialog shows company role reference

---

## 🔄 Migration Notes

**No database migration needed!**

- `location_users.location_role` column still exists
- Values are now auto-populated based on company role
- Existing data remains intact
- New assignments use auto-derived roles

---

## 📚 Developer Guide

### Check What Location Role a User Will Get

```typescript
import { getLocationRoleFromCompanyRole } from '@/lib/utils/location-roles'

const user = { role: 'office' }
const locationRole = getLocationRoleFromCompanyRole(user.role)
// Returns: 'location_admin'
```

### Get Description for UI

```typescript
import { getLocationRoleDescription } from '@/lib/utils/location-roles'

const description = getLocationRoleDescription('sales_manager')
// Returns: "Team lead (coordinate work, no admin access)"
```

### Assign User to Location (Auto-Derived Role)

```typescript
import { getLocationRoleFromCompanyRole } from '@/lib/utils/location-roles'

const userRole = 'office'
const locationRole = getLocationRoleFromCompanyRole(userRole)

await assignUserToLocation.mutateAsync({
  user_id: userId,
  location_id: locationId,
  location_role: locationRole, // auto-derived
})
```

---

## 🎉 Benefits

1. ✅ **Simpler UX**: One role to manage, not two
2. ✅ **Less Confusion**: Clear hierarchy based on company role
3. ✅ **Fewer Errors**: Can't accidentally assign wrong location role
4. ✅ **Consistent**: Location permissions always match company role
5. ✅ **Auto-Assignment**: Office users don't need to think about locations
6. ✅ **Smart Defaults**: Auto-selects when only one location exists

---

**System is now much simpler and easier to understand!** 🚀
