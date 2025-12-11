-- Update user roles to match new role system
-- Migration: 20241211000001_update_user_roles.sql

-- First, drop the old check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Update any existing roles BEFORE adding the new constraint
UPDATE public.users 
SET role = 'sales' 
WHERE role = 'user';

UPDATE public.users 
SET role = 'sales_manager' 
WHERE role = 'manager';

-- Now add the new check constraint with updated roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'office', 'sales_manager', 'sales', 'production', 'marketing'));

