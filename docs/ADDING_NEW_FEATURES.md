# Adding New Features to Ketterly CRM

This checklist ensures new features are properly integrated with permissions, multi-tenancy, and follow project conventions.

---

## Pre-Development Checklist

- [ ] Feature is scoped and requirements are clear
- [ ] Database schema changes are documented
- [ ] Permission requirements are identified
- [ ] Multi-tenant isolation strategy is defined
- [ ] UI/UX mockups are approved (if applicable)

---

## 1. Database Schema

### Add Tables

```sql
CREATE TABLE IF NOT EXISTS public.new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL, -- ✅ REQUIRED
  
  -- Your columns here
  name TEXT NOT NULL,
  description TEXT,
  
  -- Metadata (required)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ, -- ✅ Soft deletes
  
  -- Optional: tracking
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX idx_new_feature_company_id ON public.new_feature(company_id);
CREATE INDEX idx_new_feature_deleted_at ON public.new_feature(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE public.new_feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's records"
  ON public.new_feature FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert their company's records"
  ON public.new_feature FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's records"
  ON public.new_feature FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Comments
COMMENT ON TABLE public.new_feature IS 'Description of what this table stores';
```

**Checklist:**
- [ ] Table includes `company_id` column with FK constraint
- [ ] Table has `created_at`, `updated_at`, `deleted_at` columns
- [ ] Index on `company_id` exists
- [ ] RLS policies filter by `company_id`
- [ ] Migration file created in `supabase/migrations/`

---

## 2. TypeScript Types

**File:** `lib/types/[feature].ts`

```typescript
// Base interface
export interface NewFeature {
  id: string
  company_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Insert type (omit generated fields)
export interface NewFeatureInsert {
  company_id: string
  name: string
  description?: string | null
}

// Update type (all fields optional except identifiers)
export interface NewFeatureUpdate {
  name?: string
  description?: string | null
}

// With relations (if applicable)
export interface NewFeatureWithRelations extends NewFeature {
  created_by_user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

// Filters
export interface NewFeatureFilters {
  search?: string
  status?: 'active' | 'archived'
}
```

**Checklist:**
- [ ] Interface includes all table columns
- [ ] `Insert` type omits auto-generated fields
- [ ] `Update` type has all fields optional
- [ ] `WithRelations` type for joined data (if needed)
- [ ] Filter interface defined
- [ ] Types exported from main types index

---

## 3. Permissions

### Add Permission Columns

```sql
-- Add to user_permissions table
ALTER TABLE public.user_permissions 
ADD COLUMN can_view_new_feature BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_create_new_feature BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_edit_new_feature BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_delete_new_feature BOOLEAN DEFAULT false NOT NULL;
```

### Update Type Definitions

**File:** `lib/types/users.ts`

```typescript
export interface UserPermissions {
  // ... existing permissions
  
  // New Feature
  can_view_new_feature: boolean
  can_create_new_feature: boolean
  can_edit_new_feature: boolean
  can_delete_new_feature: boolean
}

export interface UserPermissionsUpdate {
  // ... existing permissions
  
  // New Feature
  can_view_new_feature?: boolean
  can_create_new_feature?: boolean
  can_edit_new_feature?: boolean
  can_delete_new_feature?: boolean
}

export const ALL_PERMISSIONS: PermissionKey[] = [
  // ... existing
  'can_view_new_feature',
  'can_create_new_feature',
  'can_edit_new_feature',
  'can_delete_new_feature',
]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  // ... existing
  can_view_new_feature: 'View New Feature',
  can_create_new_feature: 'Create New Feature',
  can_edit_new_feature: 'Edit New Feature',
  can_delete_new_feature: 'Delete New Feature',
}

export const PERMISSION_CATEGORIES = {
  // ... existing categories
  'New Feature': [
    'can_view_new_feature',
    'can_create_new_feature',
    'can_edit_new_feature',
    'can_delete_new_feature',
  ],
} as const
```

### Update Role Templates

**File:** `lib/types/users.ts`

```typescript
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Partial<Record<PermissionKey, boolean>>> = {
  admin: {
    // ... existing
    can_view_new_feature: true,
    can_create_new_feature: true,
    can_edit_new_feature: true,
    can_delete_new_feature: true,
  },
  office: {
    // ... existing
    can_view_new_feature: true,
    can_create_new_feature: true,
    can_edit_new_feature: true,
    can_delete_new_feature: false,
  },
  // ... configure for other roles
}
```

**Checklist:**
- [ ] Permission columns added to database
- [ ] Permissions added to `UserPermissions` interface
- [ ] Permissions added to `ALL_PERMISSIONS` array
- [ ] Labels added to `PERMISSION_LABELS`
- [ ] Category added to `PERMISSION_CATEGORIES`
- [ ] Role templates updated with new permissions
- [ ] `grantAllPermissions()` function updated
- [ ] `revokeAllPermissions()` function updated

---

## 4. API Layer

**File:** `lib/api/[feature].ts`

```typescript
import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import { NewFeature, NewFeatureInsert, NewFeatureUpdate, NewFeatureFilters } from '@/lib/types/[feature]'

// =====================================================
// GET ALL
// =====================================================

export async function getNewFeatures(
  companyId: string,
  filters?: NewFeatureFilters
): Promise<ApiResponse<NewFeature[]>> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('new_feature')
      .select('*')
      .eq('company_id', companyId) // ✅ ALWAYS filter by company
      .is('deleted_at', null) // ✅ Exclude soft-deleted
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data, error: null, count: count || undefined }
  } catch (error) {
    console.error('Failed to fetch records:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET ONE
// =====================================================

export async function getNewFeature(
  id: string
): Promise<ApiResponse<NewFeature>> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('new_feature')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to fetch record:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CREATE
// =====================================================

export async function createNewFeature(
  companyId: string,
  input: NewFeatureInsert
): Promise<ApiResponse<NewFeature>> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('new_feature')
      .insert({
        ...input,
        company_id: companyId, // ✅ ALWAYS set company_id
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to create record:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// UPDATE
// =====================================================

export async function updateNewFeature(
  id: string,
  input: NewFeatureUpdate
): Promise<ApiResponse<NewFeature>> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('new_feature')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to update record:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DELETE (Soft Delete)
// =====================================================

export async function deleteNewFeature(
  id: string
): Promise<ApiResponse<void>> {
  const supabase = createClient()
  
  try {
    // ✅ Soft delete - set deleted_at timestamp
    const { error } = await supabase
      .from('new_feature')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    console.error('Failed to delete record:', error)
    return createErrorResponse(error)
  }
}
```

**Checklist:**
- [ ] All functions filter by `company_id`
- [ ] All queries exclude `deleted_at IS NOT NULL`
- [ ] Delete function uses soft delete
- [ ] Error handling with try/catch
- [ ] Consistent return type `ApiResponse<T>`
- [ ] Proper TypeScript types

---

## 5. React Query Hooks

**File:** `lib/hooks/use-[feature].ts`

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentCompany } from './use-current-company'
import {
  getNewFeatures,
  getNewFeature,
  createNewFeature,
  updateNewFeature,
  deleteNewFeature,
} from '@/lib/api/[feature]'
import { NewFeatureInsert, NewFeatureUpdate, NewFeatureFilters } from '@/lib/types/[feature]'

// =====================================================
// QUERIES
// =====================================================

export function useNewFeatures(filters?: NewFeatureFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['new-features', company?.id, filters],
    queryFn: () => getNewFeatures(company!.id, filters),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useNewFeature(id: string | undefined) {
  return useQuery({
    queryKey: ['new-feature', id],
    queryFn: () => getNewFeature(id!),
    enabled: !!id,
  })
}

// =====================================================
// MUTATIONS
// =====================================================

export function useCreateNewFeature() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: NewFeatureInsert) => createNewFeature(company!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-features', company?.id] })
      toast.success('Created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create: ${error.message}`)
    },
  })
}

export function useUpdateNewFeature() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NewFeatureUpdate }) =>
      updateNewFeature(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['new-features', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['new-feature', variables.id] })
      toast.success('Updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`)
    },
  })
}

export function useDeleteNewFeature() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteNewFeature(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-features', company?.id] })
      toast.success('Deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`)
    },
  })
}
```

**Checklist:**
- [ ] Uses `useCurrentCompany()` for company context
- [ ] Query keys include company ID
- [ ] Mutations invalidate relevant queries
- [ ] Toast notifications for success/error
- [ ] Proper TypeScript types
- [ ] `enabled` flag checks for required data

---

## 6. UI Components

### List Component

**File:** `components/admin/[feature]/[feature]-list.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useNewFeatures, useDeleteNewFeature } from '@/lib/hooks/use-[feature]'
import { useCheckPermission } from '@/lib/hooks/use-permissions'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateDialog } from './create-dialog'
import { EditDialog } from './edit-dialog'

export function NewFeatureList() {
  const { user } = useAuth()
  const { data: response, isLoading } = useNewFeatures()
  const deleteItem = useDeleteNewFeature()
  
  // Check permissions
  const { data: canView } = useCheckPermission(user?.id, 'can_view_new_feature')
  const { data: canCreate } = useCheckPermission(user?.id, 'can_create_new_feature')
  const { data: canDelete } = useCheckPermission(user?.id, 'can_delete_new_feature')

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  if (!canView) {
    return <div>You don't have permission to view this feature</div>
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  const items = response?.data || []

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error('You don\'t have permission to delete')
      return
    }
    
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem.mutateAsync(id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Feature</h1>
        {canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Button>
        )}
      </div>

      {/* List/Table implementation */}
      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => {
                setSelectedItem(item)
                setEditDialogOpen(true)
              }}>
                Edit
              </Button>
              {canDelete && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      {selectedItem && (
        <EditDialog
          item={selectedItem}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  )
}
```

**Checklist:**
- [ ] Permission checks before rendering UI elements
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Responsive design
- [ ] Accessibility (ARIA labels, keyboard navigation)

---

## 7. Routes

### Page Component

**File:** `app/(admin)/admin/[feature]/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewFeatureList } from '@/components/admin/[feature]/[feature]-list'

export const metadata = {
  title: 'New Feature | Ketterly CRM',
  description: 'Manage your new feature records',
}

export default async function NewFeaturePage() {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check permission
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('can_view_new_feature')
    .eq('user_id', user.id)
    .single()

  if (!permissions?.can_view_new_feature) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="container mx-auto py-6">
      <NewFeatureList />
    </div>
  )
}
```

**Checklist:**
- [ ] Server-side authentication check
- [ ] Server-side permission check
- [ ] Proper metadata
- [ ] Error boundaries
- [ ] Loading states

---

## 8. Navigation

### Update Sidebar

**File:** `components/admin/layouts/sidebar.tsx`

Add new feature to navigation:

```typescript
import { NewFeatureIcon } from 'lucide-react'

const navigation = [
  // ... existing items
  {
    name: 'New Feature',
    href: '/admin/new-feature',
    icon: NewFeatureIcon,
    permission: 'can_view_new_feature', // ✅ Permission check
  },
]
```

**Checklist:**
- [ ] Navigation item added
- [ ] Icon selected
- [ ] Permission check added
- [ ] Route matches page location

---

## 9. Documentation

### Update Files

1. **Feature Documentation**: Create `docs/NEW_FEATURE.md` with:
   - Overview and purpose
   - User guide
   - API reference
   - Common workflows

2. **Permissions Documentation**: Update `docs/PERMISSIONS_SYSTEM.md`:
   - Add new permissions to category list
   - Update total permission count
   - Document role template changes

3. **Copilot Instructions**: Update `.github/copilot-instructions.md`:
   - Add feature to project overview
   - Document any special patterns

**Checklist:**
- [ ] Feature documentation created
- [ ] Permissions documentation updated
- [ ] Copilot instructions updated
- [ ] README updated (if applicable)

---

## 10. Testing

### Manual Testing Checklist

- [ ] Create operation works
- [ ] Read/list operation works
- [ ] Update operation works
- [ ] Delete operation (soft delete) works
- [ ] Multi-tenant isolation verified (can't see other company's data)
- [ ] Permissions work correctly:
  - [ ] Admin can access all features
  - [ ] Office staff has appropriate access
  - [ ] Sales users have appropriate access
  - [ ] Production users have appropriate access
  - [ ] Users without permissions see proper error/redirect
- [ ] Search/filter works
- [ ] Pagination works (if applicable)
- [ ] Mobile responsive
- [ ] Accessibility (keyboard navigation, screen readers)

### Testing Workflow

```typescript
// Test multi-tenancy
// 1. Login as Company A admin, create record
// 2. Login as Company B admin, verify can't see Company A's record
// 3. Login as Company A user, verify can see Company A's record

// Test permissions
// 1. Create user with no permissions
// 2. Verify can't access feature
// 3. Grant view permission
// 4. Verify can view but not create/edit/delete
// 5. Grant all permissions
// 6. Verify full access
```

**Checklist:**
- [ ] All CRUD operations tested
- [ ] Multi-tenancy tested with 2+ companies
- [ ] Permission checks tested for all roles
- [ ] Error states tested
- [ ] Edge cases tested

---

## 11. Deployment

### Pre-Deployment Checklist

- [ ] All code reviewed
- [ ] All tests passing
- [ ] Database migration ready
- [ ] Migration tested on staging
- [ ] Documentation complete
- [ ] Permissions seeded for existing users
- [ ] Navigation updated
- [ ] No console errors
- [ ] No TypeScript errors

### Deployment Steps

1. **Run Database Migration:**
   ```sql
   -- Copy migration SQL from supabase/migrations/[timestamp]_new_feature.sql
   -- Paste into Supabase Dashboard SQL Editor
   -- Execute
   ```

2. **Seed Permissions for Existing Users:**
   ```sql
   -- Update existing admin users with new permissions
   UPDATE user_permissions 
   SET 
     can_view_new_feature = true,
     can_create_new_feature = true,
     can_edit_new_feature = true,
     can_delete_new_feature = true,
     updated_at = NOW()
   WHERE user_id IN (
     SELECT id FROM users WHERE role = 'admin'
   );
   ```

3. **Deploy Application:**
   ```bash
   git add .
   git commit -m "feat: add new feature with permissions"
   git push origin main
   ```

4. **Verify Deployment:**
   - [ ] Database migration applied successfully
   - [ ] Application deployed without errors
   - [ ] Feature accessible in production
   - [ ] Permissions working correctly
   - [ ] No console errors

---

## Post-Deployment

### Monitoring

- [ ] Check error logs for any issues
- [ ] Monitor user feedback
- [ ] Verify performance metrics
- [ ] Check database query performance

### User Communication

- [ ] Announce new feature to users
- [ ] Provide documentation/training
- [ ] Collect feedback
- [ ] Address any issues promptly

---

## Quick Reference

### Must-Have Patterns

1. **Always filter by company_id** in queries
2. **Always check permissions** before rendering UI
3. **Use soft deletes** (`deleted_at` timestamp)
4. **Always exclude soft-deleted** records from queries
5. **Use RLS policies** on all tables
6. **Use `useCurrentCompany()`** for company context
7. **Invalidate React Query cache** after mutations
8. **Show toast notifications** for user feedback
9. **Handle loading states** properly
10. **Handle error states** gracefully

---

## Need Help?

- Review existing features (leads, quotes, projects) for patterns
- Check documentation in `docs/` directory
- Review `.github/copilot-instructions.md` for guidelines
- Ask your development team

---

**Version:** 1.0.0  
**Last Updated:** December 11, 2024
