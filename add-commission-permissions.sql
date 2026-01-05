-- Add missing commission permission columns to user_permissions table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS can_approve_commissions BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS can_view_all_commissions BOOLEAN DEFAULT false NOT NULL;

-- Grant permissions to admin and office roles
UPDATE public.user_permissions 
SET 
  can_approve_commissions = true,
  can_view_all_commissions = true
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE role IN ('admin', 'office', 'super_admin')
);

-- Confirm the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_permissions'
AND column_name IN ('can_approve_commissions', 'can_view_all_commissions');
