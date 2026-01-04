-- Migration: Add missing can_manage_commissions column
-- Created: 2026-01-02
-- Purpose: Ensure user_permissions table has all columns that company_roles JSONB contains

-- Add the missing column
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS can_manage_commissions BOOLEAN DEFAULT false NOT NULL;

-- Update existing users to have this permission based on their role
-- Admin, office, and sales_manager should have this permission
UPDATE public.user_permissions up
SET can_manage_commissions = true
FROM public.users u
WHERE up.user_id = u.id
  AND u.role IN ('admin', 'super_admin', 'office', 'sales_manager')
  AND u.deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN public.user_permissions.can_manage_commissions IS 'Can manage commission plans and rates';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_permissions' 
  AND column_name = 'can_manage_commissions';
