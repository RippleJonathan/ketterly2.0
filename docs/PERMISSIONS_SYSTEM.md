# Permissions System Documentation

## Overview

The Ketterly CRM permission system provides granular access control for all users within a company. Permissions are stored in the `user_permissions` table and can be managed through the admin UI or API.

### Key Features

- ✅ **Granular Control**: 44 individual permissions across 9 categories
- ✅ **Role Templates**: Pre-configured permission sets for common roles
- ✅ **Bulk Operations**: Select/deselect entire categories or all permissions
- ✅ **Search & Filter**: Quickly find specific permissions
- ✅ **Copy Permissions**: Duplicate settings from one user to another
- ✅ **Visual UI**: Intuitive accordion-based interface with progress tracking
- ✅ **Safety Checks**: Prevents users from revoking critical permissions from themselves

---

## Permission Categories

### 1. Leads & Projects (5 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Leads | `can_view_leads` | View lead information and details |
| Create Leads | `can_create_leads` | Create new leads in the system |
| Edit Leads | `can_edit_leads` | Modify existing lead information |
| Delete Leads | `can_delete_leads` | Delete leads from the system |
| View All Leads | `can_view_all_leads` | View all company leads (not just assigned) |

### 2. Quotes (6 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Quotes | `can_view_quotes` | View quote details and history |
| Create Quotes | `can_create_quotes` | Generate new quotes for customers |
| Edit Quotes | `can_edit_quotes` | Modify existing quotes |
| Delete Quotes | `can_delete_quotes` | Delete quotes from the system |
| Approve Quotes | `can_approve_quotes` | Approve quotes before sending |
| Send Quotes | `can_send_quotes` | Send quotes to customers via email |

### 3. Invoices & Payments (6 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Invoices | `can_view_invoices` | View invoice details and payment history |
| Create Invoices | `can_create_invoices` | Create new invoices |
| Edit Invoices | `can_edit_invoices` | Modify existing invoices |
| Delete Invoices | `can_delete_invoices` | Delete invoices from the system |
| Record Payments | `can_record_payments` | Record customer payments |
| Void Payments | `can_void_payments` | Void or reverse payments |

### 4. Material Orders (5 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Material Orders | `can_view_material_orders` | View material order details |
| Create Material Orders | `can_create_material_orders` | Create new material orders |
| Edit Material Orders | `can_edit_material_orders` | Modify material orders |
| Delete Material Orders | `can_delete_material_orders` | Delete material orders |
| Mark Orders Paid | `can_mark_orders_paid` | Mark material orders as paid |

### 5. Work Orders & Crew (5 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Work Orders | `can_view_work_orders` | View work order details and assignments |
| Create Work Orders | `can_create_work_orders` | Create new work orders |
| Edit Work Orders | `can_edit_work_orders` | Modify work order details |
| Delete Work Orders | `can_delete_work_orders` | Delete work orders |
| Assign Crew | `can_assign_crew` | Assign crew members to projects |

### 6. Customers (4 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Customers | `can_view_customers` | View customer information |
| Create Customers | `can_create_customers` | Add new customers to the system |
| Edit Customers | `can_edit_customers` | Modify customer information |
| Delete Customers | `can_delete_customers` | Delete customers from the system |

### 7. Financials & Reports (4 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Financials | `can_view_financials` | View financial reports and profitability |
| View Profit Margins | `can_view_profit_margins` | View profit margins on jobs |
| View Commission Reports | `can_view_commission_reports` | View commission reports |
| Export Reports | `can_export_reports` | Export reports and analytics data |

### 8. Users & Settings (6 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| View Users | `can_view_users` | View user list and details |
| Create Users | `can_create_users` | Create new user accounts |
| Edit Users | `can_edit_users` | Modify user information |
| Delete Users | `can_delete_users` | Delete user accounts |
| **Manage Permissions** ⚠️ | `can_manage_permissions` | Manage user permissions (admin only) |
| Edit Company Settings | `can_edit_company_settings` | Modify company settings |

### 9. Production (3 permissions)

| Permission | Key | Description |
|------------|-----|-------------|
| Upload Photos | `can_upload_photos` | Upload project photos |
| Update Project Status | `can_update_project_status` | Update project status and progress |
| View Project Timeline | `can_view_project_timeline` | View project timelines and schedules |

---

## Role Templates

Pre-configured permission sets for common roles:

### Admin (42/44 permissions)
**Full access** to all features, reports, and settings. Only role that can manage permissions.

### Office Staff (28/44 permissions)
Focus on **operations**: quotes, invoices, customers, scheduling. Cannot access financials or user management.

### Sales Manager (25/44 permissions)
Manage sales team with **lead visibility**, quote approval, and commission reports.

### Sales Rep (17/44 permissions)
**Customer-facing** role: create leads, generate quotes, manage assigned customers.

### Production/Crew (12/44 permissions)
**Field operations**: view work orders, upload photos, update project status.

### Marketing (16/44 permissions)
**Lead generation & analytics**: create leads, view reports, export data.

---

## Using the Permission System

### 1. Managing Permissions via UI

**Navigate to Users:**
```
Admin → Users → [Select User] → Manage Permissions
```

**The Permission Manager provides:**
- **Stats Bar**: Shows X/44 permissions enabled with visual progress bar
- **Search**: Filter permissions by name or description
- **Two Tabs**:
  - **Permissions**: Category-based permission toggles
  - **Role Templates**: One-click application of role presets
- **Bulk Actions**: 
  - Enable/Disable All (global)
  - Select/Deselect All (per category)

### 2. Checking Permissions in Code

#### Client Components

```typescript
import { useUserPermissions } from '@/lib/hooks/use-permissions'

function MyComponent() {
  const { data: permissionsResponse } = useUserPermissions(userId)
  const permissions = permissionsResponse?.data

  if (!permissions?.can_create_quotes) {
    return <div>You don't have permission to create quotes</div>
  }

  return <CreateQuoteButton />
}
```

#### Check Multiple Permissions

```typescript
import { useCheckPermissions } from '@/lib/hooks/use-permissions'

function MyComponent() {
  const { data: perms } = useCheckPermissions(userId, [
    'can_view_quotes',
    'can_create_quotes',
    'can_send_quotes'
  ])

  return (
    <div>
      {perms?.can_view_quotes && <ViewQuotes />}
      {perms?.can_create_quotes && <CreateQuoteButton />}
      {perms?.can_send_quotes && <SendQuoteButton />}
    </div>
  )
}
```

#### Server Components

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function QuotesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('can_view_quotes, can_create_quotes')
    .eq('user_id', user!.id)
    .single()

  if (!permissions?.can_view_quotes) {
    redirect('/admin/dashboard')
  }

  // ... rest of page
}
```

### 3. API Functions

#### Update Permissions

```typescript
import { updateUserPermissions } from '@/lib/api/permissions'

const result = await updateUserPermissions(userId, {
  can_view_leads: true,
  can_create_leads: true,
  can_edit_leads: true,
  can_delete_leads: false,
})
```

#### Copy Permissions

```typescript
import { copyPermissions } from '@/lib/api/permissions'

// Copy from senior rep to new rep
await copyPermissions(seniorRepId, newRepId)
```

#### Grant All Permissions

```typescript
import { grantAllPermissions } from '@/lib/api/permissions'

// Make user an admin
await grantAllPermissions(userId)
```

#### Revoke All Permissions

```typescript
import { revokeAllPermissions } from '@/lib/api/permissions'

// Remove all permissions
await revokeAllPermissions(userId)
```

### 4. React Query Hooks

```typescript
import { 
  useUpdatePermissions,
  useCopyPermissions,
  useGrantAllPermissions,
  useRevokeAllPermissions 
} from '@/lib/hooks/use-permissions'

function PermissionActions({ userId }: { userId: string }) {
  const updatePerms = useUpdatePermissions()
  const copyPerms = useCopyPermissions()
  const grantAll = useGrantAllPermissions()
  const revokeAll = useRevokeAllPermissions()

  const handleUpdate = () => {
    updatePerms.mutate({
      userId,
      permissions: { can_view_leads: true }
    })
  }

  const handleCopy = (fromUserId: string) => {
    copyPerms.mutate({ fromUserId, toUserId: userId })
  }

  const handleGrantAll = () => {
    grantAll.mutate(userId)
  }

  const handleRevokeAll = () => {
    revokeAll.mutate(userId)
  }

  return (
    // ... UI
  )
}
```

---

## Adding New Permissions

When adding a new feature to Ketterly, follow this checklist:

### Step 1: Update Database Schema

```sql
-- Add column to user_permissions table
ALTER TABLE public.user_permissions 
ADD COLUMN can_new_feature boolean DEFAULT false NOT NULL;
```

### Step 2: Update TypeScript Types

**File:** `lib/types/users.ts`

```typescript
export interface UserPermissions {
  // ... existing permissions
  
  // New Feature Category
  can_new_feature: boolean
  can_another_feature: boolean
}

export interface UserPermissionsUpdate {
  // ... existing permissions
  
  // New Feature Category
  can_new_feature?: boolean
  can_another_feature?: boolean
}
```

### Step 3: Add to Permission Constants

**File:** `lib/types/users.ts`

```typescript
export const ALL_PERMISSIONS: PermissionKey[] = [
  // ... existing
  'can_new_feature',
  'can_another_feature',
]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  // ... existing
  can_new_feature: 'Use New Feature',
  can_another_feature: 'Another Feature Action',
}

export const PERMISSION_CATEGORIES = {
  // ... existing categories
  'New Feature Category': [
    'can_new_feature',
    'can_another_feature',
  ],
} as const
```

### Step 4: Add Descriptions (Optional)

**File:** `components/admin/users/permissions-manager.tsx`

```typescript
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  // ... existing
  can_new_feature: 'Allows user to access the new feature',
  can_another_feature: 'Allows user to perform another action',
}
```

### Step 5: Add Category Icon (Optional)

**File:** `components/admin/users/permissions-manager.tsx`

```typescript
import { NewIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  // ... existing
  'New Feature Category': <NewIcon className="h-4 w-4" />,
}
```

### Step 6: Update Role Templates

**File:** `lib/types/users.ts`

```typescript
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Partial<Record<PermissionKey, boolean>>> = {
  admin: {
    // ... existing
    can_new_feature: true,
    can_another_feature: true,
  },
  office: {
    // ... existing
    can_new_feature: true,
    can_another_feature: false,
  },
  // ... other roles
}
```

### Step 7: Update API Functions

**File:** `lib/api/permissions.ts`

Update `grantAllPermissions` and `revokeAllPermissions` to include new permissions:

```typescript
export async function grantAllPermissions(userId: string) {
  const allPermissions: UserPermissionsUpdate = {
    // ... existing
    can_new_feature: true,
    can_another_feature: true,
  }
  // ... rest of function
}
```

### Step 8: Update Documentation

Update this file (`docs/PERMISSIONS_SYSTEM.md`) with the new permissions in the appropriate category.

---

## Database Schema

### user_permissions Table

```sql
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Leads & Projects (5)
  can_view_leads BOOLEAN DEFAULT false NOT NULL,
  can_create_leads BOOLEAN DEFAULT false NOT NULL,
  can_edit_leads BOOLEAN DEFAULT false NOT NULL,
  can_delete_leads BOOLEAN DEFAULT false NOT NULL,
  can_view_all_leads BOOLEAN DEFAULT false NOT NULL,
  
  -- Quotes (6)
  can_view_quotes BOOLEAN DEFAULT false NOT NULL,
  can_create_quotes BOOLEAN DEFAULT false NOT NULL,
  can_edit_quotes BOOLEAN DEFAULT false NOT NULL,
  can_delete_quotes BOOLEAN DEFAULT false NOT NULL,
  can_approve_quotes BOOLEAN DEFAULT false NOT NULL,
  can_send_quotes BOOLEAN DEFAULT false NOT NULL,
  
  -- Invoices & Payments (6)
  can_view_invoices BOOLEAN DEFAULT false NOT NULL,
  can_create_invoices BOOLEAN DEFAULT false NOT NULL,
  can_edit_invoices BOOLEAN DEFAULT false NOT NULL,
  can_delete_invoices BOOLEAN DEFAULT false NOT NULL,
  can_record_payments BOOLEAN DEFAULT false NOT NULL,
  can_void_payments BOOLEAN DEFAULT false NOT NULL,
  
  -- Material Orders (5)
  can_view_material_orders BOOLEAN DEFAULT false NOT NULL,
  can_create_material_orders BOOLEAN DEFAULT false NOT NULL,
  can_edit_material_orders BOOLEAN DEFAULT false NOT NULL,
  can_delete_material_orders BOOLEAN DEFAULT false NOT NULL,
  can_mark_orders_paid BOOLEAN DEFAULT false NOT NULL,
  
  -- Work Orders (5)
  can_view_work_orders BOOLEAN DEFAULT false NOT NULL,
  can_create_work_orders BOOLEAN DEFAULT false NOT NULL,
  can_edit_work_orders BOOLEAN DEFAULT false NOT NULL,
  can_delete_work_orders BOOLEAN DEFAULT false NOT NULL,
  can_assign_crew BOOLEAN DEFAULT false NOT NULL,
  
  -- Customers (4)
  can_view_customers BOOLEAN DEFAULT false NOT NULL,
  can_create_customers BOOLEAN DEFAULT false NOT NULL,
  can_edit_customers BOOLEAN DEFAULT false NOT NULL,
  can_delete_customers BOOLEAN DEFAULT false NOT NULL,
  
  -- Financials & Reports (4)
  can_view_financials BOOLEAN DEFAULT false NOT NULL,
  can_view_profit_margins BOOLEAN DEFAULT false NOT NULL,
  can_view_commission_reports BOOLEAN DEFAULT false NOT NULL,
  can_export_reports BOOLEAN DEFAULT false NOT NULL,
  
  -- Users & Settings (6)
  can_view_users BOOLEAN DEFAULT false NOT NULL,
  can_create_users BOOLEAN DEFAULT false NOT NULL,
  can_edit_users BOOLEAN DEFAULT false NOT NULL,
  can_delete_users BOOLEAN DEFAULT false NOT NULL,
  can_manage_permissions BOOLEAN DEFAULT false NOT NULL,
  can_edit_company_settings BOOLEAN DEFAULT false NOT NULL,
  
  -- Production (3)
  can_upload_photos BOOLEAN DEFAULT false NOT NULL,
  can_update_project_status BOOLEAN DEFAULT false NOT NULL,
  can_view_project_timeline BOOLEAN DEFAULT false NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_user_permissions UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);

-- RLS Policies
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permissions in their company"
  ON public.user_permissions FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Admins can manage permissions in their company"
  ON public.user_permissions FOR ALL
  USING (user_id IN (SELECT id FROM public.users WHERE company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())));
```

---

## Best Practices

### ✅ DO

- Always check permissions before displaying UI elements
- Use role templates as starting points for new users
- Test permission changes in a non-production environment first
- Document any custom permissions you add
- Use bulk operations when setting up multiple users
- Regularly audit user permissions for security

### ❌ DON'T

- Never hardcode permission checks with user IDs
- Don't allow users to grant themselves `can_manage_permissions`
- Don't skip permission checks on server-side API routes
- Don't delete the super_admin role from the database
- Don't expose financial permissions to non-admin roles without careful consideration

---

## Troubleshooting

### User can't access a feature they should have permission for

1. Check if permissions record exists:
```sql
SELECT * FROM user_permissions WHERE user_id = '[USER_ID]';
```

2. Check if RLS policies are enabled:
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_permissions';
```

3. Verify user's company_id matches:
```sql
SELECT u.id, u.email, u.company_id, up.* 
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.id = '[USER_ID]';
```

### Permission changes not reflecting in UI

1. Clear React Query cache (refresh page)
2. Check browser console for API errors
3. Verify Supabase connection is active
4. Check if user has proper authentication token

### Can't update permissions for admin users

Check if the user has `can_manage_permissions` permission themselves. Only admins can modify other users' permissions.

---

## Migration Guide

If upgrading from an older version without the permission system:

### Step 1: Run Migration

```sql
-- See supabase/migrations/[timestamp]_user_management_and_permissions.sql
```

### Step 2: Seed Admin Permissions

```sql
-- Grant all permissions to existing admins
INSERT INTO user_permissions (user_id, [all_permissions_set_to_true])
SELECT id FROM users WHERE role = 'admin'
ON CONFLICT (user_id) DO UPDATE SET
  can_manage_permissions = true,
  -- ... all other permissions = true
  updated_at = NOW();
```

### Step 3: Apply Role Templates

Use the API or UI to apply appropriate role templates to existing users based on their current role.

---

## Support

For questions or issues with the permission system:

1. Check this documentation first
2. Review the code in `lib/types/users.ts` and `lib/api/permissions.ts`
3. Check existing patterns in `components/admin/users/permissions-manager.tsx`
4. Contact your development team

---

**Last Updated:** December 11, 2024  
**Version:** 1.0.0
