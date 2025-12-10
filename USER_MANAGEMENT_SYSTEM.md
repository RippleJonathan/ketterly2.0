# User Management & Permissions System - Implementation Complete

## Overview

Complete user management system with commission plans, granular permissions (40+ permissions), role templates, and commission tracking. This is foundational infrastructure for multi-user operations, team management, and sales compensation.

---

## What We Built

### 1. Database Schema (Migration Created) ✅

**File**: `supabase/migrations/20241210000004_user_management_and_permissions.sql` (467 lines)

#### Tables Created:

1. **commission_plans** - Flexible pay structures
   - 5 commission types: percentage, flat_per_job, tiered, hourly_plus, salary_plus
   - Calculate on: revenue, profit, or collected
   - Paid when: signed, deposit, completed, or collected
   - JSONB tier_structure for complex tiered commissions
   - Tracks hourly_rate and salary_amount for plus plans

2. **user_permissions** - Granular access control
   - 40+ boolean permission fields organized by category:
     * Leads & Projects (5 permissions)
     * Quotes (6 permissions)
     * Invoices & Payments (6 permissions)
     * Material Orders (5 permissions)
     * Work Orders & Crew (5 permissions)
     * Customers (4 permissions)
     * Financials & Reports (4 permissions)
     * Users & Settings (6 permissions)
     * Production (3 permissions)
   - Auto-created for each new user via database trigger

3. **role_templates** - Reusable permission sets
   - Stores default permissions as JSONB
   - Can be applied to multiple users at once
   - Supports base_role (admin, manager, user)
   - 4 default templates auto-created for new companies:
     1. **Administrator** - Full access (all permissions true)
     2. **Sales Representative** - Leads, quotes, customers, own commissions
     3. **Project Manager** - Operations, orders, crew, financials with profit
     4. **Field Crew** - View assigned, upload photos, update status only

4. **user_commissions** - Track earnings per job
   - Links user to lead/job
   - Stores calculated_amount and paid_amount separately
   - Tracks job_revenue, job_profit, job_collected for reference
   - Status workflow: pending → approved → paid (or held/voided)
   - Paid_date for record keeping

#### Extended Users Table:
- `commission_plan_id` - Link to pay structure
- `hire_date` - Employee start date
- `date_of_birth` - For HR records
- `emergency_contact_name` & `emergency_contact_phone`
- `bio` - User biography/about me
- `specialties[]` - Array of specializations
- `certifications[]` - Array of certifications
- `assigned_territories[]` - Geographic assignments

#### RLS Policies:
- All tables company-scoped (can only see own company data)
- Users can view their own permissions
- Admins/managers can view all users and manage permissions
- Commission access: admins manage all, users view own

#### Functions:
- `create_default_role_templates(p_company_id)` - Creates 4 default templates for new companies

---

### 2. TypeScript Types ✅

**File**: `lib/types/users.ts` (550+ lines)

#### Core Types:
- `User`, `UserInsert`, `UserUpdate`, `UserWithRelations`
- `UserFilters` - Search/filter users
- `UserFormData` - Create user form
- `InviteUserData` - Invite user via email

#### Commission Types:
- `CommissionPlan`, `CommissionPlanInsert`, `CommissionPlanUpdate`
- `CommissionType` - 5 pay structure types
- `CalculateOn` - revenue | profit | collected
- `PaidWhen` - signed | deposit | completed | collected
- `TierStructure` - For tiered commissions

#### Permission Types:
- `UserPermissions` - All 40+ boolean fields
- `UserPermissionsUpdate` - Partial updates
- `PermissionKey` - Type-safe permission names
- `ALL_PERMISSIONS` - Array of all permission keys
- `PERMISSION_LABELS` - Human-readable labels
- `PERMISSION_CATEGORIES` - Grouped by category for UI

#### Role Template Types:
- `RoleTemplate`, `RoleTemplateInsert`, `RoleTemplateUpdate`

#### Commission Tracking Types:
- `UserCommission`, `UserCommissionInsert`, `UserCommissionUpdate`
- `CommissionStatus` - pending | approved | paid | held | voided

---

### 3. API Functions ✅

#### **lib/api/users.ts** (390 lines)
- `getUsers(companyId, filters)` - List all users with filters
- `getUserById(userId, companyId)` - Get single user with relations
- `getCurrentUser()` - Get logged-in user
- `createUser(companyId, userData)` - Create via Supabase Auth
- `inviteUser(companyId, inviteData)` - Send email invite
- `updateUser(userId, companyId, updates)` - Update user info
- `deleteUser(userId, companyId)` - Soft delete
- `deactivateUser(userId, companyId)` - Mark inactive
- `reactivateUser(userId, companyId)` - Mark active
- `uploadAvatar(userId, file)` - Upload to Supabase Storage
- `deleteAvatar(userId)` - Remove avatar
- `getForemen(companyId)` - Get crew foremen
- `getCrewMembers(companyId, foremanId)` - Get crew under foreman

#### **lib/api/permissions.ts** (280 lines)
- `getUserPermissions(userId)` - Get all permissions
- `updateUserPermissions(userId, permissions)` - Update permissions
- `copyPermissions(fromUserId, toUserId)` - Copy between users
- `grantAllPermissions(userId)` - Make admin
- `revokeAllPermissions(userId)` - Remove all access
- `checkPermission(userId, permission)` - Check single permission
- `checkPermissions(userId, permissions[])` - Check multiple
- `bulkUpdatePermissions(userId, permissions)` - Update multiple at once

#### **lib/api/commission-plans.ts** (250 lines)
- `getCommissionPlans(companyId, includeInactive)` - List plans
- `getCommissionPlanById(planId, companyId)` - Get single plan
- `createCommissionPlan(companyId, plan, createdBy)` - Create plan
- `updateCommissionPlan(planId, companyId, updates)` - Update plan
- `deleteCommissionPlan(planId, companyId)` - Soft delete (checks if users using it)
- `deactivateCommissionPlan(planId, companyId)` - Mark inactive
- `reactivateCommissionPlan(planId, companyId)` - Mark active
- `getUsersUsingPlan(planId, companyId)` - See who's on this plan
- `calculateCommission(input)` - Helper to calculate commission amount

#### **lib/api/role-templates.ts** (260 lines)
- `getRoleTemplates(companyId, includeInactive)` - List templates
- `getRoleTemplateById(templateId, companyId)` - Get single template
- `createRoleTemplate(companyId, template, createdBy)` - Create template
- `updateRoleTemplate(templateId, companyId, updates)` - Update template
- `deleteRoleTemplate(templateId, companyId)` - Soft delete
- `deactivateRoleTemplate(templateId, companyId)` - Mark inactive
- `reactivateRoleTemplate(templateId, companyId)` - Mark active
- `applyRoleTemplate(userId, templateId)` - Apply to one user
- `applyRoleTemplateToMultiple(userIds[], templateId)` - Apply to many
- `createTemplateFromUser(companyId, userId, name, description)` - Save user's permissions as template
- `duplicateRoleTemplate(templateId, companyId, newName)` - Copy template

#### **lib/api/user-commissions.ts** (360 lines)
- `getUserCommissions(companyId, userId?, status?)` - List commissions
- `getCommissionById(commissionId, companyId)` - Get single commission
- `createCommission(commissionData)` - Create commission
- `updateCommission(commissionId, companyId, updates)` - Update commission
- `approveCommission(commissionId, companyId)` - Approve for payment
- `markCommissionPaid(commissionId, companyId, paidAmount, paidDate)` - Record payment
- `holdCommission(commissionId, companyId, notes)` - Place on hold
- `voidCommission(commissionId, companyId, notes)` - Cancel commission
- `getCommissionSummary(companyId, userId)` - Get totals (earned, paid, pending, etc.)
- `getCommissionsForLead(leadId, companyId)` - All commissions for a job
- `bulkApproveCommissions(commissionIds[], companyId)` - Approve multiple
- `bulkMarkPaid(commissionIds[], companyId, paidDate)` - Mark multiple paid

---

### 4. React Query Hooks ✅

#### **lib/hooks/use-users.ts** (220 lines)
**Queries:**
- `useUsers(filters)` - List users with filters
- `useUser(userId)` - Single user
- `useCurrentUser()` - Logged-in user
- `useForemen()` - Crew foremen
- `useCrewMembers(foremanId)` - Crew under foreman

**Mutations:**
- `useCreateUser()` - Create user
- `useInviteUser()` - Invite user
- `useUpdateUser()` - Update user
- `useDeleteUser()` - Delete user
- `useDeactivateUser()` - Deactivate
- `useReactivateUser()` - Reactivate
- `useUploadAvatar()` - Upload avatar
- `useDeleteAvatar()` - Delete avatar

#### **lib/hooks/use-permissions.ts** (160 lines)
**Queries:**
- `useUserPermissions(userId)` - Get permissions
- `useCheckPermission(userId, permission)` - Check one
- `useCheckPermissions(userId, permissions[])` - Check many

**Mutations:**
- `useUpdatePermissions()` - Update permissions
- `useCopyPermissions()` - Copy between users
- `useGrantAllPermissions()` - Make admin
- `useRevokeAllPermissions()` - Remove all
- `useBulkUpdatePermissions()` - Update multiple

#### **lib/hooks/use-commission-plans.ts** (180 lines)
**Queries:**
- `useCommissionPlans(includeInactive)` - List plans
- `useCommissionPlan(planId)` - Single plan
- `useUsersUsingPlan(planId)` - Who's on this plan

**Mutations:**
- `useCreateCommissionPlan()` - Create plan
- `useUpdateCommissionPlan()` - Update plan
- `useDeleteCommissionPlan()` - Delete plan
- `useDeactivateCommissionPlan()` - Deactivate
- `useReactivateCommissionPlan()` - Reactivate

#### **lib/hooks/use-role-templates.ts** (210 lines)
**Queries:**
- `useRoleTemplates(includeInactive)` - List templates
- `useRoleTemplate(templateId)` - Single template

**Mutations:**
- `useCreateRoleTemplate()` - Create template
- `useUpdateRoleTemplate()` - Update template
- `useDeleteRoleTemplate()` - Delete template
- `useDeactivateRoleTemplate()` - Deactivate
- `useReactivateRoleTemplate()` - Reactivate
- `useApplyRoleTemplate()` - Apply to one user
- `useApplyRoleTemplateToMultiple()` - Apply to many
- `useCreateTemplateFromUser()` - Save user's permissions
- `useDuplicateRoleTemplate()` - Copy template

#### **lib/hooks/use-user-commissions.ts** (240 lines)
**Queries:**
- `useCommissions(userId?, status?)` - List commissions
- `useCommission(commissionId)` - Single commission
- `useCommissionSummary(userId)` - User's totals
- `useCommissionsForLead(leadId)` - Job's commissions

**Mutations:**
- `useCreateCommission()` - Create commission
- `useUpdateCommission()` - Update commission
- `useApproveCommission()` - Approve for payment
- `useMarkCommissionPaid()` - Record payment
- `useHoldCommission()` - Place on hold
- `useVoidCommission()` - Cancel commission
- `useBulkApproveCommissions()` - Approve multiple
- `useBulkMarkPaid()` - Mark multiple paid

---

## Next Steps

### 1. Run Migrations 🔴 REQUIRED

```sql
-- Copy contents of these files into Supabase Dashboard SQL Editor:
1. supabase/migrations/20241210000003_add_is_paid_to_material_orders.sql
2. supabase/migrations/20241210000004_user_management_and_permissions.sql
```

### 2. Set Up Storage Bucket (Optional for now)

If you want avatar uploads to work:
```sql
-- Create user-avatars bucket in Supabase Storage
-- Set to public read access
-- Add RLS policies for upload/delete
```

### 3. Build UI Components

**Priority 1: User Management UI**
- `app/(admin)/admin/users/page.tsx` - User list page
- `components/admin/users/user-list.tsx` - Table with actions
- `components/admin/users/create-user-dialog.tsx` - Create form
- `components/admin/users/edit-user-dialog.tsx` - Edit form
- `components/admin/users/user-actions-menu.tsx` - Dropdown actions

**Priority 2: Permissions Editor**
- `components/admin/users/permissions-editor.tsx` - 40+ checkboxes organized by category
- `components/admin/users/copy-permissions-dialog.tsx` - Copy from another user
- `components/admin/users/apply-template-dialog.tsx` - Apply role template

**Priority 3: Profile Management**
- `app/(admin)/admin/profile/page.tsx` - User's own profile
- `components/admin/profile/profile-form.tsx` - Edit name, phone, bio, etc.
- `components/admin/profile/avatar-upload.tsx` - Upload photo
- `components/admin/profile/change-password.tsx` - Password change

**Priority 4: Commission Plans UI**
- `app/(admin)/admin/settings/commission-plans/page.tsx` - List plans
- `components/admin/settings/commission-plan-form.tsx` - Create/edit plan
- `components/admin/settings/commission-plan-card.tsx` - Display plan details

**Priority 5: Role Templates UI**
- `app/(admin)/admin/settings/role-templates/page.tsx` - List templates
- `components/admin/settings/role-template-form.tsx` - Create/edit template
- `components/admin/settings/role-template-card.tsx` - Display template

**Priority 6: Commission Tracking UI**
- `app/(admin)/admin/commissions/page.tsx` - Commission dashboard
- `components/admin/commissions/commission-list.tsx` - List with filters
- `components/admin/commissions/commission-summary.tsx` - User's totals
- `components/admin/commissions/approve-dialog.tsx` - Approve commission
- `components/admin/commissions/mark-paid-dialog.tsx` - Record payment

---

## Key Features

### Commission Plans
✅ 5 flexible pay structures (percentage, flat, tiered, hourly+, salary+)
✅ Calculate on revenue, profit, or collected amounts
✅ Paid when: signed, deposit, completed, or collected
✅ JSONB tier structure for complex tiered plans
✅ Track users using each plan
✅ Prevent deletion if users assigned
✅ Activate/deactivate plans

### Permissions System
✅ 40+ granular boolean permissions
✅ Organized into 9 categories
✅ Copy permissions between users
✅ Bulk update multiple permissions
✅ Grant/revoke all permissions (admin mode)
✅ Check single or multiple permissions
✅ Type-safe permission keys with labels

### Role Templates
✅ Reusable permission sets stored as JSONB
✅ Apply to one or multiple users at once
✅ Create template from existing user's permissions
✅ Duplicate existing templates
✅ 4 default templates auto-created:
   - Administrator (full access)
   - Sales Representative (sales focus)
   - Project Manager (operations focus)
   - Field Crew (limited view/update)

### Commission Tracking
✅ Track earnings per lead/job
✅ Status workflow: pending → approved → paid
✅ Hold or void commissions with notes
✅ Bulk approve and bulk mark paid
✅ Commission summary per user (earned, paid, pending)
✅ View all commissions for a job
✅ Store job financials (revenue, profit, collected) for reference

### User Profiles
✅ Extended user data (hire_date, DOB, emergency contacts)
✅ Bio and specialties
✅ Certifications tracking
✅ Assigned territories
✅ Avatar upload support
✅ Crew role (foreman/laborer)
✅ Link laborers to foremen

---

## Database Schema Details

### commission_plans Table
```sql
- id (uuid, primary key)
- company_id (uuid, references companies)
- name (text, required)
- description (text, nullable)
- is_active (boolean, default true)
- commission_type (text, check constraint)
- commission_rate (decimal 5,2)
- flat_amount (decimal 10,2)
- tier_structure (jsonb)
- hourly_rate (decimal 10,2)
- salary_amount (decimal 10,2)
- calculate_on (text, check constraint)
- paid_when (text, check constraint)
- created_by (uuid, references users)
- created_at, updated_at, deleted_at (timestamptz)
```

### user_permissions Table
```sql
- id (uuid, primary key)
- user_id (uuid, references users, unique)
- can_view_leads (boolean, default false)
- can_create_leads (boolean, default false)
- ... (40+ more boolean fields)
- created_at, updated_at (timestamptz)
```

### role_templates Table
```sql
- id (uuid, primary key)
- company_id (uuid, references companies)
- name (text, required)
- description (text, nullable)
- base_role (text, check constraint)
- default_permissions (jsonb, required)
- is_active (boolean, default true)
- created_by (uuid, references users)
- created_at, updated_at, deleted_at (timestamptz)
```

### user_commissions Table
```sql
- id (uuid, primary key)
- company_id (uuid, references companies)
- user_id (uuid, references users)
- lead_id (uuid, references leads)
- commission_plan_id (uuid, references commission_plans)
- calculated_amount (decimal 10,2, required)
- paid_amount (decimal 10,2, default 0)
- job_revenue, job_profit, job_collected (decimal 10,2)
- status (text, check constraint)
- paid_date (date)
- notes (text)
- created_at, updated_at (timestamptz)
```

### Extended users Table Fields
```sql
- commission_plan_id (uuid, references commission_plans)
- hire_date (date)
- date_of_birth (date)
- emergency_contact_name (text)
- emergency_contact_phone (text)
- bio (text)
- specialties (text[])
- certifications (text[])
- assigned_territories (text[])
```

---

## API Architecture

All API functions follow consistent pattern:
1. Accept `companyId` as first parameter (always filter by company)
2. Return `ApiResponse<T>` type (data, error, count?)
3. Include soft delete filters (`.is('deleted_at', null)`)
4. Use transactions for multi-step operations
5. Validate permissions in RLS policies (not application code)

All React Query hooks:
1. Use `useCurrentCompany()` to get company context
2. Include company ID in query keys for proper cache invalidation
3. Set appropriate `staleTime` (users: 5 min, commissions: 2 min)
4. Invalidate related queries on mutations
5. Show toast notifications for success/error

---

## Testing Checklist

Before building UI, verify:

### Database ✅ (Created, pending run)
- [x] Migration file created (467 lines)
- [ ] Run migration in Supabase Dashboard
- [ ] Verify tables created
- [ ] Verify RLS policies active
- [ ] Test default role templates creation

### Types ✅ (Complete)
- [x] User types with all new fields
- [x] Commission plan types
- [x] Permission types with all 40+ fields
- [x] Role template types
- [x] Commission tracking types

### API Functions ✅ (Complete)
- [x] Users CRUD with auth integration
- [x] Permissions management
- [x] Commission plans CRUD
- [x] Role templates CRUD with apply/duplicate
- [x] User commissions with workflow

### React Query Hooks ✅ (Complete)
- [x] User hooks (8 queries + 8 mutations)
- [x] Permission hooks (3 queries + 5 mutations)
- [x] Commission plan hooks (3 queries + 5 mutations)
- [x] Role template hooks (2 queries + 8 mutations)
- [x] User commission hooks (4 queries + 8 mutations)

### UI Components ⏳ (Next phase)
- [ ] User list and management
- [ ] Permissions editor
- [ ] Profile editing
- [ ] Commission plan management
- [ ] Role template management
- [ ] Commission tracking dashboard

---

## Files Created

### Database
1. `supabase/migrations/20241210000004_user_management_and_permissions.sql` (467 lines)

### Types
2. `lib/types/users.ts` (550+ lines)

### API Functions
3. `lib/api/users.ts` (390 lines)
4. `lib/api/permissions.ts` (280 lines)
5. `lib/api/commission-plans.ts` (250 lines)
6. `lib/api/role-templates.ts` (260 lines)
7. `lib/api/user-commissions.ts` (360 lines)

### React Query Hooks
8. `lib/hooks/use-users.ts` (220 lines)
9. `lib/hooks/use-permissions.ts` (160 lines)
10. `lib/hooks/use-commission-plans.ts` (180 lines)
11. `lib/hooks/use-role-templates.ts` (210 lines)
12. `lib/hooks/use-user-commissions.ts` (240 lines)

### Documentation
13. `USER_MANAGEMENT_SYSTEM.md` (this file)

**Total Lines of Code**: ~3,500+ lines

---

## Architecture Benefits

1. **Type Safety**: Full TypeScript coverage with auto-complete and type checking
2. **API Consistency**: All functions follow same pattern (company-scoped, soft deletes, ApiResponse)
3. **React Query**: Automatic caching, refetching, and cache invalidation
4. **RLS Security**: Database enforces data isolation, not application code
5. **Flexibility**: Commission plans support 5 pay structures with JSONB for complex tiers
6. **Granularity**: 40+ permissions allow fine-grained access control
7. **Reusability**: Role templates enable quick user setup with consistent permissions
8. **Audit Trail**: All tables have created_at, updated_at, soft deletes
9. **Scalability**: JSONB fields allow adding new data without schema changes
10. **User Experience**: Toast notifications, optimistic updates, loading states

---

## Commission Calculation Examples

### Percentage (5% of revenue)
```typescript
plan = {
  commission_type: 'percentage',
  commission_rate: 5,
  calculate_on: 'revenue'
}
revenue = $10,000
commission = $10,000 * 0.05 = $500
```

### Flat Per Job
```typescript
plan = {
  commission_type: 'flat_per_job',
  flat_amount: 250
}
commission = $250 (regardless of job size)
```

### Tiered (based on profit)
```typescript
plan = {
  commission_type: 'tiered',
  calculate_on: 'profit',
  tier_structure: [
    { min: 0, max: 5000, rate: 5 },
    { min: 5001, max: 10000, rate: 7 },
    { min: 10001, max: null, rate: 10 }
  ]
}
profit = $8,000
commission = $8,000 * 0.07 = $560
```

### Hourly Plus (hourly + commission)
```typescript
plan = {
  commission_type: 'hourly_plus',
  hourly_rate: 25,
  commission_rate: 2,
  calculate_on: 'revenue'
}
hours = 40
revenue = $10,000
commission = (40 * $25) + ($10,000 * 0.02) = $1,000 + $200 = $1,200
```

### Salary Plus (salary + commission)
```typescript
plan = {
  commission_type: 'salary_plus',
  salary_amount: 4000,
  commission_rate: 3,
  calculate_on: 'profit'
}
profit = $5,000
commission = $4,000 + ($5,000 * 0.03) = $4,000 + $150 = $4,150
```

---

## Status: Foundation Complete ✅

All backend infrastructure, types, API functions, and React Query hooks are complete. Ready to build UI components.

**Next Action**: Run database migrations, then start building admin UI for user management.
