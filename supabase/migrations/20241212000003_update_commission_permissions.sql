-- Migration: Update commission permissions to be more granular
-- Replaces generic view/manage with specific CRUD + own vs all

-- Drop old generic permission columns
ALTER TABLE public.user_permissions 
DROP COLUMN IF EXISTS can_view_commissions,
DROP COLUMN IF EXISTS can_manage_commissions,
DROP COLUMN IF EXISTS can_mark_commissions_paid;

-- Add new granular permission columns
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS can_view_own_commissions BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_view_all_commissions BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create_commissions BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_commissions BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_commissions BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_mark_commissions_paid BOOLEAN NOT NULL DEFAULT false;

-- Set default permissions based on roles

-- Admin: Full access to all commissions
UPDATE public.user_permissions
SET 
  can_view_own_commissions = true,
  can_view_all_commissions = true,
  can_create_commissions = true,
  can_edit_commissions = true,
  can_delete_commissions = true,
  can_mark_commissions_paid = true
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'admin' AND deleted_at IS NULL
);

-- Office: Full access to all commissions
UPDATE public.user_permissions
SET 
  can_view_own_commissions = true,
  can_view_all_commissions = true,
  can_create_commissions = true,
  can_edit_commissions = true,
  can_delete_commissions = true,
  can_mark_commissions_paid = true
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'office' AND deleted_at IS NULL
);

-- Sales Manager: View all, create, edit, but not delete or mark paid
UPDATE public.user_permissions
SET 
  can_view_own_commissions = true,
  can_view_all_commissions = true,
  can_create_commissions = true,
  can_edit_commissions = true,
  can_delete_commissions = false,
  can_mark_commissions_paid = false
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'sales_manager' AND deleted_at IS NULL
);

-- Sales: View own only
UPDATE public.user_permissions
SET 
  can_view_own_commissions = true,
  can_view_all_commissions = false,
  can_create_commissions = false,
  can_edit_commissions = false,
  can_delete_commissions = false,
  can_mark_commissions_paid = false
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'sales' AND deleted_at IS NULL
);

-- Production: No commission access
UPDATE public.user_permissions
SET 
  can_view_own_commissions = false,
  can_view_all_commissions = false,
  can_create_commissions = false,
  can_edit_commissions = false,
  can_delete_commissions = false,
  can_mark_commissions_paid = false
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'production' AND deleted_at IS NULL
);

-- Marketing: View own only
UPDATE public.user_permissions
SET 
  can_view_own_commissions = true,
  can_view_all_commissions = false,
  can_create_commissions = false,
  can_edit_commissions = false,
  can_delete_commissions = false,
  can_mark_commissions_paid = false
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'marketing' AND deleted_at IS NULL
);

-- Customer: No commission access
UPDATE public.user_permissions
SET 
  can_view_own_commissions = false,
  can_view_all_commissions = false,
  can_create_commissions = false,
  can_edit_commissions = false,
  can_delete_commissions = false,
  can_mark_commissions_paid = false
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'customer' AND deleted_at IS NULL
);

-- Add comment explaining the permission structure
COMMENT ON COLUMN user_permissions.can_view_own_commissions IS 'View only commissions assigned to this user';
COMMENT ON COLUMN user_permissions.can_view_all_commissions IS 'View all commissions for any user in the company';
COMMENT ON COLUMN user_permissions.can_create_commissions IS 'Create new commission records on leads';
COMMENT ON COLUMN user_permissions.can_edit_commissions IS 'Edit existing commission records';
COMMENT ON COLUMN user_permissions.can_delete_commissions IS 'Delete commission records';
COMMENT ON COLUMN user_permissions.can_mark_commissions_paid IS 'Mark commissions as paid';
