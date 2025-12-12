-- Make created_by nullable for lead_commissions to allow auto-creation
-- when user session is temporarily unavailable

ALTER TABLE public.lead_commissions 
ALTER COLUMN created_by DROP NOT NULL;

-- Add default value for system-created commissions
COMMENT ON COLUMN public.lead_commissions.created_by IS 'User who created this commission record (NULL for auto-generated)';
