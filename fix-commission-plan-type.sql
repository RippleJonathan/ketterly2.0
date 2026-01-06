-- Fix: The commission_plans table uses 'flat_per_job' but lead_commissions expects 'flat_amount'
-- We need to update the CHECK constraint on commission_plans to match lead_commissions

-- Step 1: Drop the old constraint
ALTER TABLE public.commission_plans 
DROP CONSTRAINT IF EXISTS commission_plans_commission_type_check;

-- Step 2: Update existing data to use valid values BEFORE adding new constraint
UPDATE public.commission_plans
SET 
  commission_type = 'flat_amount',
  updated_at = NOW()
WHERE commission_type = 'flat_per_job'
AND deleted_at IS NULL;

-- Map any other old types to valid ones
UPDATE public.commission_plans
SET 
  commission_type = 'custom',
  updated_at = NOW()
WHERE commission_type IN ('tiered', 'hourly_plus', 'salary_plus')
AND deleted_at IS NULL;

-- Step 3: Add new constraint with matching values (AFTER data is updated)
ALTER TABLE public.commission_plans
ADD CONSTRAINT commission_plans_commission_type_check 
CHECK (commission_type IN (
  'percentage',    -- % of total
  'flat_amount',   -- Fixed amount (changed from 'flat_per_job')
  'custom'         -- Custom calculation
));

-- Step 4: Verify the fix
SELECT 
  name,
  commission_type,
  commission_rate,
  flat_amount,
  paid_when
FROM public.commission_plans
WHERE deleted_at IS NULL
ORDER BY name;
