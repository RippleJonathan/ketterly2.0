-- Fix commission_plans paid_when constraint and data

-- 1. Drop the old constraint FIRST
ALTER TABLE commission_plans 
DROP CONSTRAINT IF EXISTS commission_plans_paid_when_check;

-- 2. Update existing data to use new values (BEFORE adding new constraint)
UPDATE commission_plans 
SET paid_when = 'when_deposit_paid' 
WHERE paid_when = 'deposit';

UPDATE commission_plans 
SET paid_when = 'when_final_payment' 
WHERE paid_when IN ('final', 'collected');

UPDATE commission_plans 
SET paid_when = 'when_job_completed' 
WHERE paid_when = 'complete';

-- 3. NOW add new constraint with correct values (AFTER data is updated)
ALTER TABLE commission_plans
ADD CONSTRAINT commission_plans_paid_when_check 
CHECK (paid_when IN ('when_deposit_paid', 'when_final_payment', 'when_job_completed', 'custom'));

-- 4. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Commission plans paid_when values updated!';
  RAISE NOTICE '   - Old "deposit" → "when_deposit_paid"';
  RAISE NOTICE '   - Old "collected/final" → "when_final_payment"';
  RAISE NOTICE '   - Old "complete" → "when_job_completed"';
END $$;
