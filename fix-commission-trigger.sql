-- Fix the commission eligibility trigger to use correct paid_when values

CREATE OR REPLACE FUNCTION auto_update_commission_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
  v_total_paid DECIMAL(10,2);
  v_commission RECORD;
BEGIN
  -- Only process if payment is not deleted and has cleared_at timestamp
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get invoice details
  SELECT * INTO v_invoice FROM customer_invoices WHERE id = NEW.invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate total paid on invoice (non-deleted payments only)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id
  AND deleted_at IS NULL;
  
  -- Loop through all pending commissions for this invoice's lead
  FOR v_commission IN 
    SELECT lc.*
    FROM lead_commissions lc
    WHERE lc.lead_id = v_invoice.lead_id
    AND lc.status = 'pending'
    AND lc.deleted_at IS NULL
  LOOP
    -- Check if payment trigger is met
    DECLARE
      is_eligible BOOLEAN := false;
    BEGIN
      CASE v_commission.paid_when
        WHEN 'when_deposit_paid' THEN
          -- Eligible after any cleared payment
          is_eligible := NEW.cleared_at IS NOT NULL;
        WHEN 'when_final_payment' THEN
          -- Eligible when invoice balance is zero
          is_eligible := v_invoice.balance_due <= 0;
        WHEN 'when_job_completed' THEN
          -- Eligible when invoice status is 'paid' or balance is zero
          is_eligible := v_invoice.status = 'paid' OR v_invoice.balance_due <= 0;
        ELSE
          is_eligible := false;
      END CASE;
      
      -- Update commission to eligible if trigger met
      IF is_eligible THEN
        UPDATE lead_commissions
        SET 
          status = 'eligible',
          triggered_by_payment_id = NEW.id,
          updated_at = NOW()
        WHERE id = v_commission.id;
        
        RAISE NOTICE 'Commission % now eligible (triggered by payment %)', v_commission.id, NEW.id;
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_update_commission_eligibility ON payments;
CREATE TRIGGER trigger_auto_update_commission_eligibility
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_commission_eligibility();

-- Also add balance_owed column if it doesn't exist
ALTER TABLE public.lead_commissions 
ADD COLUMN IF NOT EXISTS balance_owed DECIMAL(10,2);

-- Set initial balance_owed to calculated_amount for existing commissions
UPDATE public.lead_commissions 
SET balance_owed = calculated_amount 
WHERE balance_owed IS NULL;
