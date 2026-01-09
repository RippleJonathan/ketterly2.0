-- Fix commission recalculation trigger to properly use flat_amount for flat commissions
-- File: supabase/migrations/20260108000001_fix_flat_commission_calculation.sql

-- Drop and recreate the function with the fix
CREATE OR REPLACE FUNCTION auto_recalculate_commissions_on_invoice_change()
RETURNS TRIGGER AS $$
DECLARE
  v_commission RECORD;
  v_plan RECORD;
  v_new_base_amount DECIMAL(10,2);
  v_new_commission_amount DECIMAL(10,2);
  v_delta DECIMAL(10,2);
BEGIN
  -- Only for updates where total_amount changed
  IF TG_OP = 'UPDATE' AND NEW.total_amount != OLD.total_amount THEN
    
    -- Loop through all non-paid commissions for this invoice's lead
    FOR v_commission IN 
      SELECT * FROM lead_commissions 
      WHERE lead_id = NEW.lead_id
      AND status IN ('pending', 'eligible', 'approved')
      AND deleted_at IS NULL
    LOOP
      -- Get commission plan
      SELECT * INTO v_plan FROM commission_plans WHERE id = v_commission.commission_plan_id;
      
      CONTINUE WHEN v_plan IS NULL;
      
      -- Recalculate base amount
      CASE v_plan.calculate_on
        WHEN 'revenue' THEN
          v_new_base_amount := NEW.total_amount;
        WHEN 'profit' THEN
          v_new_base_amount := NEW.total_amount * 0.7;
        WHEN 'collected' THEN
          -- For collected, base on actual payments
          SELECT COALESCE(SUM(amount), 0) INTO v_new_base_amount
          FROM payments
          WHERE invoice_id = NEW.id AND deleted_at IS NULL;
        ELSE
          v_new_base_amount := NEW.total_amount;
      END CASE;
      
      -- Recalculate commission amount
      -- FIX: Use flat_amount for flat_amount type, commission_rate for percentage
      IF v_plan.commission_type = 'percentage' THEN
        v_new_commission_amount := v_new_base_amount * (COALESCE(v_plan.commission_rate, 0) / 100);
      ELSIF v_plan.commission_type = 'flat_amount' THEN
        v_new_commission_amount := COALESCE(v_plan.flat_amount, 0);
      ELSE
        -- Fallback to percentage calculation
        v_new_commission_amount := v_new_base_amount * (COALESCE(v_plan.commission_rate, 0) / 100);
      END IF;
      
      -- Calculate delta (new amount - already paid)
      v_delta := v_new_commission_amount - COALESCE(v_commission.paid_amount, 0);
      
      -- Update commission
      UPDATE lead_commissions
      SET 
        calculated_amount = v_new_commission_amount,
        base_amount = v_new_base_amount,
        balance_owed = v_delta,
        -- If amount increased and was previously approved, reset to pending
        status = CASE 
          WHEN v_delta > v_commission.calculated_amount - COALESCE(v_commission.paid_amount, 0) 
               AND status = 'approved' 
          THEN 'pending'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = v_commission.id;
      
      RAISE NOTICE 'Recalculated commission % (old: %, new: %, delta: %)', 
        v_commission.id, v_commission.calculated_amount, v_new_commission_amount, v_delta;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists, no need to recreate
COMMENT ON FUNCTION auto_recalculate_commissions_on_invoice_change() IS 'Fixed to use flat_amount for flat commissions instead of rate';

-- Fix existing commissions with flat_amount that have $0 calculated_amount
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
  AND lc.calculated_amount = 0
  AND lc.deleted_at IS NULL;

-- Show what was updated
SELECT 
  lc.id,
  u.full_name as user_name,
  l.full_name as lead_name,
  lc.flat_amount,
  lc.calculated_amount,
  lc.balance_owed
FROM lead_commissions lc
LEFT JOIN users u ON u.id = lc.user_id
LEFT JOIN leads l ON l.id = lc.lead_id
WHERE 
  lc.commission_type = 'flat_amount'
  AND lc.flat_amount > 0
  AND lc.deleted_at IS NULL
ORDER BY lc.created_at DESC
LIMIT 10;
