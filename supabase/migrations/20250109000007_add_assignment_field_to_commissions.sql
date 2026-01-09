-- Add assignment_field column to lead_commissions table
-- This tracks which lead assignment field this commission is for
-- (e.g., 'sales_rep_id', 'marketing_rep_id', 'office_manager_id')

ALTER TABLE public.lead_commissions
ADD COLUMN IF NOT EXISTS assignment_field TEXT DEFAULT NULL;

COMMENT ON COLUMN public.lead_commissions.assignment_field IS 'Which lead assignment field this commission is for (sales_rep_id, marketing_rep_id, office_manager_id, etc.)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_lead_commissions_assignment_field ON public.lead_commissions(assignment_field);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
