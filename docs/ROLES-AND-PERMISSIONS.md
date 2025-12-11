# Roles and Permissions Guide

## Overview
Ketterly uses a role-based access control (RBAC) system with granular permissions. Each role comes with a predefined set of permissions that can be customized per user.

---

## Roles

### 1. **Admin** - Company Owner/Administrator
**Full access to all features**

- Manage entire company operations
- Create and manage users
- View financial data and profit margins
- Configure company settings
- Approve quotes and payments

**Use Case**: Company owner, general manager, executive team

---

### 2. **Office Staff**
**Manages day-to-day operations: quotes, invoices, customers, scheduling**

**Can Do**:
- ✅ Create and edit leads, quotes, invoices
- ✅ Manage customers and scheduling
- ✅ Send quotes to customers
- ✅ Record payments
- ✅ View all leads
- ✅ Assign crew to projects
- ✅ Export reports

**Cannot Do**:
- ❌ View profit margins or financials
- ❌ Approve quotes (requires admin/sales manager)
- ❌ Void payments or mark orders paid
- ❌ Delete records (safety measure)
- ❌ Manage users or permissions

**Use Case**: Office manager, administrative assistant, coordinator

---

### 3. **Sales Manager**
**Leads the sales team and oversees all sales activities**

**Can Do**:
- ✅ View and manage all leads (entire team)
- ✅ Create and approve quotes
- ✅ View financial data and profit margins
- ✅ View commission reports (team and self)
- ✅ Manage customers
- ✅ Export reports

**Cannot Do**:
- ❌ Create invoices or record payments
- ❌ Manage material/work orders
- ❌ Manage users or company settings
- ❌ Upload photos or update project status

**Use Case**: Sales director, sales team lead, VP of sales

---

### 4. **Sales**
**Sales representatives managing leads and creating quotes**

**Can Do**:
- ✅ View and manage assigned leads only
- ✅ Create and edit quotes
- ✅ Send quotes to customers
- ✅ Create and manage customers
- ✅ View own commission reports
- ✅ View invoices and project timeline

**Cannot Do**:
- ❌ View all leads (only assigned ones)
- ❌ Approve quotes (needs manager approval)
- ❌ View profit margins or financials
- ❌ Create invoices or record payments
- ❌ Access material/work orders
- ❌ Manage users

**Use Case**: Sales representative, account executive, business development

---

### 5. **Production/Crew**
**Field workers managing work orders and project execution**

**Can Do**:
- ✅ View assigned work orders
- ✅ Update work order details
- ✅ Upload project photos
- ✅ Update project status
- ✅ View material orders
- ✅ View customer info for jobs
- ✅ View project timeline

**Cannot Do**:
- ❌ View leads or create quotes
- ❌ View financial data
- ❌ Create or delete any records
- ❌ Manage customers
- ❌ Access invoices or payments

**Use Case**: Foreman, crew leader, field technician, installer

---

### 6. **Marketing**
**Marketing team managing campaigns and analyzing lead performance**

**Can Do**:
- ✅ View all leads (for analytics)
- ✅ Create leads from campaigns
- ✅ View quotes (conversion tracking)
- ✅ View customers (demographics)
- ✅ View financials (ROI metrics)
- ✅ Export reports and analytics

**Cannot Do**:
- ❌ Approve or send quotes
- ❌ Create invoices or record payments
- ❌ View profit margins
- ❌ Access work orders or material orders
- ❌ Manage users or company settings

**Use Case**: Marketing manager, digital marketer, marketing coordinator

---

## Permission Categories

### 📋 Leads & Projects
- `can_view_leads` - View leads in the system
- `can_create_leads` - Create new leads
- `can_edit_leads` - Edit existing leads
- `can_delete_leads` - Delete leads
- `can_view_all_leads` - View all company leads (vs. only assigned)

### 💰 Quotes
- `can_view_quotes` - View quotes
- `can_create_quotes` - Create new quotes
- `can_edit_quotes` - Edit quotes
- `can_delete_quotes` - Delete quotes
- `can_approve_quotes` - Approve quotes for sending
- `can_send_quotes` - Send quotes to customers

### 🧾 Invoices & Payments
- `can_view_invoices` - View invoices
- `can_create_invoices` - Create new invoices
- `can_edit_invoices` - Edit invoices
- `can_delete_invoices` - Delete invoices
- `can_record_payments` - Record customer payments
- `can_void_payments` - Void/reverse payments

### 🔨 Material Orders
- `can_view_material_orders` - View material orders
- `can_create_material_orders` - Create material orders
- `can_edit_material_orders` - Edit material orders
- `can_delete_material_orders` - Delete material orders
- `can_mark_orders_paid` - Mark orders as paid

### 👷 Work Orders & Crew
- `can_view_work_orders` - View work orders
- `can_create_work_orders` - Create work orders
- `can_edit_work_orders` - Edit work orders
- `can_delete_work_orders` - Delete work orders
- `can_assign_crew` - Assign crew to projects

### 👥 Customers
- `can_view_customers` - View customer database
- `can_create_customers` - Create new customers
- `can_edit_customers` - Edit customer info
- `can_delete_customers` - Delete customers

### 📊 Financials & Reports
- `can_view_financials` - View financial dashboard
- `can_view_profit_margins` - View profit margins on jobs
- `can_view_commission_reports` - View commission reports
- `can_export_reports` - Export reports to CSV/PDF

### ⚙️ Users & Settings
- `can_view_users` - View user list
- `can_create_users` - Create new users
- `can_edit_users` - Edit user info
- `can_delete_users` - Delete users
- `can_manage_permissions` - Manage user permissions
- `can_edit_company_settings` - Edit company settings

### 📸 Production
- `can_upload_photos` - Upload project photos
- `can_update_project_status` - Update project progress
- `can_view_project_timeline` - View project schedule

---

## Customization

### How to Customize Permissions

1. **Via UI** (Recommended):
   - Go to **Settings → Users**
   - Click the "Permissions" icon next to any user
   - Toggle individual permissions on/off
   - Changes apply immediately

2. **Via Role Templates**:
   - Create custom role templates with specific permission sets
   - Apply templates to new users during creation
   - Useful for standardizing permissions across similar users

3. **Programmatically**:
   - Use `DEFAULT_ROLE_PERMISSIONS` constant in `lib/types/users.ts`
   - Modify for company-wide defaults
   - Update via API using `updateUserPermissions()`

### Best Practices

✅ **DO**:
- Start with default role permissions
- Only grant additional permissions when needed
- Review permissions quarterly
- Use role templates for consistency
- Document custom permission sets

❌ **DON'T**:
- Give everyone admin access
- Remove critical permissions users need to do their job
- Create overly complex custom permission sets
- Forget to update permissions when roles change

---

## Permission Hierarchy

```
Admin (Full Access)
├── Sales Manager (Sales + Financial Oversight)
│   └── Sales (Customer-Facing + Leads)
├── Office (Operations + Administrative)
└── Production (Field Work + Status Updates)
    Marketing (Lead Generation + Analytics)
```

**Note**: Marketing is separate from the sales hierarchy as they focus on lead generation rather than conversion.

---

## Implementation Notes

### For Developers

1. **Check Permissions in Code**:
```typescript
// Example: Check if user can approve quotes
const { data: permissions } = await getUserPermissions(userId)
if (permissions?.can_approve_quotes) {
  // Show approve button
}
```

2. **Apply Default Permissions**:
```typescript
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/types/users'

const defaultPerms = DEFAULT_ROLE_PERMISSIONS['sales']
// Apply to new user
```

3. **RLS Policies**:
- All permission checks happen at application level
- RLS policies enforce company-level isolation
- Never rely solely on UI for permission enforcement

---

## Migration Notes

### Updating Existing Users

If you have existing users with old roles (`manager`, `user`), map them as follows:

- `manager` → `sales_manager` or `office` (depending on responsibilities)
- `user` → `sales`, `production`, or `marketing` (depending on role)

Run this SQL in Supabase to bulk update:

```sql
-- Example: Convert all 'manager' to 'sales_manager'
UPDATE users 
SET role = 'sales_manager' 
WHERE role = 'manager';

-- Example: Convert all 'user' to 'sales' (adjust as needed)
UPDATE users 
SET role = 'sales' 
WHERE role = 'user';
```

**Important**: Review each user individually before bulk updates to ensure correct role mapping.

---

## Support

For questions about roles and permissions:
1. Check this guide first
2. Review `lib/types/users.ts` for technical details
3. Consult with your admin/manager
4. Contact Ketterly support

**Last Updated**: December 10, 2024
