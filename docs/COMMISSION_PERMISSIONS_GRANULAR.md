# Commission Permissions - Granular Structure

## Overview

Commission permissions have been updated from 3 generic permissions to **6 granular permissions** that provide fine-grained control over who can see and manage commission data.

## New Permission Structure

### 1. **can_view_own_commissions**
- **Description**: View only commissions assigned to the current user
- **Use Case**: Sales reps see their own commissions, but not other reps'
- **Access Level**: Read-only, filtered by user_id

### 2. **can_view_all_commissions**  
- **Description**: View all commissions for any user in the company
- **Use Case**: Managers and office staff can see everyone's commissions
- **Access Level**: Read-only, company-wide

### 3. **can_create_commissions**
- **Description**: Create new commission records on leads
- **Use Case**: Assign commissions when leads are converted
- **Access Level**: Write

### 4. **can_edit_commissions**
- **Description**: Modify existing commission records
- **Use Case**: Update commission amounts, notes, or payment triggers
- **Access Level**: Update

### 5. **can_delete_commissions**
- **Description**: Delete commission records (soft delete)
- **Use Case**: Remove incorrect or cancelled commissions
- **Access Level**: Delete

### 6. **can_mark_commissions_paid**
- **Description**: Mark commissions as paid and record payment details
- **Use Case**: Office/accounting marks commissions paid after payroll
- **Access Level**: Update (status field)

---

## Default Role Permissions

| Role | View Own | View All | Create | Edit | Delete | Mark Paid |
|------|:--------:|:--------:|:------:|:----:|:------:|:---------:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Office** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sales Manager** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Sales** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Production** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Marketing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Customer** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Permission Rationale:

**Admin/Office**: Full control over all commission operations
**Sales Manager**: Can view everyone's commissions and manage assignments, but can't delete or mark paid (accounting function)
**Sales/Marketing**: Can only view their own commissions (privacy)
**Production**: No commission access (not relevant to their role)

---

## Privacy & Security

### Problem Solved:
With the old generic "can_view_commissions" permission, sales reps could see each other's commission amounts, which creates:
- Salary transparency issues
- Competitive tension between reps
- Privacy concerns

### Solution:
`can_view_own_commissions` allows users to:
- See their own commission history
- Track their earnings
- View payment status

WITHOUT seeing other users' commission data.

---

## UI Implementation

### Commissions Tab Visibility:
```typescript
// Show tab if user can view own OR all commissions
const canViewCommissions = 
  permissions.can_view_own_commissions || 
  permissions.can_view_all_commissions
```

### Filter by User:
```typescript
// If user can only view own, filter by their user_id
const commissionsQuery = permissions.can_view_all_commissions
  ? getLeadCommissions(leadId) // All commissions
  : getLeadCommissions(leadId, { userId: currentUser.id }) // Only theirs
```

### Action Buttons:
```typescript
<Button disabled={!permissions.can_create_commissions}>
  Add Commission
</Button>

<Button disabled={!permissions.can_edit_commissions}>
  Edit
</Button>

<Button disabled={!permissions.can_mark_commissions_paid}>
  Mark as Paid
</Button>
```

---

## Migration Path

### Step 1: Run Permission Update
```bash
# In Supabase Dashboard SQL Editor:
supabase/migrations/20241212000003_update_commission_permissions.sql
```

This will:
1. Drop old generic permissions (can_view_commissions, can_manage_commissions)
2. Add new granular permissions (6 columns)
3. Set defaults based on user roles
4. Add permission descriptions

### Step 2: Verify Permissions
```sql
SELECT 
  u.full_name,
  u.role,
  p.can_view_own_commissions,
  p.can_view_all_commissions,
  p.can_create_commissions,
  p.can_edit_commissions,
  p.can_delete_commissions,
  p.can_mark_commissions_paid
FROM users u
JOIN user_permissions p ON p.user_id = u.id
WHERE u.deleted_at IS NULL
ORDER BY u.role;
```

Expected results match the table above.

### Step 3: Update API/UI
The background agent has already updated:
- `lib/types/users.ts` - Type definitions
- `lib/api/lead-commissions.ts` - API with permission checks
- `components/admin/leads/commissions-tab.tsx` - UI with conditional rendering

---

## API Examples

### Check Permissions:
```typescript
import { useUserPermissions } from '@/lib/hooks/use-permissions'

const { data: permissions } = useUserPermissions(userId)

if (permissions.can_view_own_commissions) {
  // Show their commissions
}

if (permissions.can_view_all_commissions) {
  // Show everyone's commissions
}

if (permissions.can_create_commissions) {
  // Show "Add Commission" button
}
```

### Fetch with Filtering:
```typescript
// Automatically filters based on permissions
const { data: commissions } = useLeadCommissions(leadId)

// API will return:
// - All commissions if can_view_all_commissions
// - Only user's commissions if can_view_own_commissions  
// - Empty if neither permission
```

---

## Testing Checklist

### As Admin:
- ✅ See all commissions on lead detail page
- ✅ Create new commission for any user
- ✅ Edit existing commissions
- ✅ Delete commissions
- ✅ Mark commissions as paid

### As Sales Rep:
- ✅ See only their own commissions
- ❌ Cannot see other sales reps' commissions
- ❌ Cannot create/edit/delete commissions
- ❌ Cannot mark as paid

### As Sales Manager:
- ✅ See all commissions
- ✅ Create commissions
- ✅ Edit commissions
- ❌ Cannot delete or mark as paid

### As Marketing:
- ✅ See only their own commissions
- ❌ Cannot see sales commissions

---

## Benefits

1. **Privacy**: Sales reps can't see each other's earnings
2. **Security**: Granular control prevents unauthorized changes
3. **Audit Trail**: Clear separation of who can do what
4. **Flexibility**: Mix and match permissions per role/user
5. **Compliance**: Meets data privacy requirements

---

## Future Enhancements

1. **Commission Approvals**: Add `can_approve_commissions` for multi-step workflow
2. **Export**: Add `can_export_commissions` for downloading reports
3. **Adjust**: Add `can_adjust_commissions` for one-time modifications
4. **View Historical**: Add `can_view_paid_commissions` to hide old paid records

---

## Questions & Answers

**Q: Can a sales rep see commissions on leads they didn't work?**
A: Only if they have `can_view_all_commissions`. With just `can_view_own_commissions`, they only see commissions assigned to their user_id.

**Q: Who can assign commissions to users?**
A: Anyone with `can_create_commissions` permission (Admin, Office, Sales Manager by default).

**Q: Can someone with can_edit_commissions change the user assigned?**
A: Yes, editing includes changing which user receives the commission.

**Q: What happens if a user is deactivated?**
A: Their commissions remain visible to users with `can_view_all_commissions`, but filtered out for `can_view_own_commissions` queries.

---

**Last Updated**: December 12, 2024  
**Status**: ✅ Production Ready  
**Migration**: `20241212000003_update_commission_permissions.sql`
