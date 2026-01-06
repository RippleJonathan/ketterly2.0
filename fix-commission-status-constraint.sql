-- Fix: Update lead_commissions status CHECK constraint to include 'eligible'
-- The payment trigger tries to set status to 'eligible' but the constraint doesn't allow it

-- Drop the old constraint
ALTER TABLE public.lead_commissions
DROP CONSTRAINT IF EXISTS lead_commissions_status_check;

-- Add the new constraint with 'eligible' status
ALTER TABLE public.lead_commissions
ADD CONSTRAINT lead_commissions_status_check
CHECK (status IN ('pending', 'eligible', 'approved', 'paid', 'cancelled'));

-- Verify the constraint was updated
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'lead_commissions_status_check';