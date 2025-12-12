-- Clean up duplicate commission tables
-- Keep only lead_commissions, drop the old commissions and user_commissions tables

-- Drop old commissions table (from invoicing migration)
DROP TABLE IF EXISTS public.commissions CASCADE;

-- Drop old user_commissions table (from user management migration)
DROP TABLE IF EXISTS public.user_commissions CASCADE;

-- Ensure lead_commissions has nullable created_by (from previous migration)
ALTER TABLE public.lead_commissions 
ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON COLUMN public.lead_commissions.created_by IS 'User who created this commission record (NULL for auto-generated)';

-- Add helpful comment
COMMENT ON TABLE public.lead_commissions IS 'Primary commission tracking table - tracks earned and paid commissions for each user per lead';
