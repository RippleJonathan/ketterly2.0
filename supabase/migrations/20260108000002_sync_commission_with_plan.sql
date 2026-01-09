-- Fix commission records that don't match their plan
-- File: supabase/migrations/20260108000002_sync_commission_with_plan.sql

-- Update commissions to match their plan's commission_type, rates, and paid_when
UPDATE lead_commissions lc
SET 
  commission_type = cp.commission_type,
  commission_rate = cp.commission_rate,
  flat_amount = cp.flat_amount,
  paid_when = cp.paid_when,
  updated_at = NOW()
FROM commission_plans cp
WHERE 
  lc.commission_plan_id = cp.id
  AND lc.deleted_at IS NULL
  AND (
    -- Type mismatch
    lc.commission_type != cp.commission_type
    OR
    -- Rate mismatch (for percentage)
    (cp.commission_type = 'percentage' AND COALESCE(lc.commission_rate, 0) != COALESCE(cp.commission_rate, 0))
    OR
    -- Flat amount mismatch (for flat_amount)
    (cp.commission_type = 'flat_amount' AND COALESCE(lc.flat_amount, 0) != COALESCE(cp.flat_amount, 0))
    OR
    -- Paid when mismatch
    lc.paid_when != cp.paid_when
  );

-- Now fix calculated amounts for flat commissions
UPDATE lead_commissions lc
SET 
  calculated_amount = COALESCE(lc.flat_amount, 0),
  base_amount = COALESCE(lc.flat_amount, 0),
  balance_owed = COALESCE(lc.flat_amount, 0) - COALESCE(lc.paid_amount, 0),
  updated_at = NOW()
WHERE 
  lc.commission_type = 'flat_amount' 
  AND lc.flat_amount IS NOT NULL
  AND lc.flat_amount > 0
  AND (
    lc.calculated_amount = 0 
    OR lc.calculated_amount != lc.flat_amount
  )
  AND lc.deleted_at IS NULL;

-- Show what was updated
SELECT 
  lc.id,
  u.full_name as user_name,
  l.full_name as lead_name,
  cp.name as plan_name,
  lc.commission_type,
  lc.commission_rate,
  lc.flat_amount,
  lc.calculated_amount,
  lc.paid_when
FROM lead_commissions lc
LEFT JOIN users u ON u.id = lc.user_id
LEFT JOIN leads l ON l.id = lc.lead_id
LEFT JOIN commission_plans cp ON cp.id = lc.commission_plan_id
WHERE 
  lc.deleted_at IS NULL
ORDER BY lc.created_at DESC
LIMIT 10;
