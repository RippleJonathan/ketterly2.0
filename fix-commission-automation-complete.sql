-- Complete Commission Automation Fix
-- Adds missing columns and creates all necessary triggers

-- 1. Add cleared_at column to payments table if it doesn't exist
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;

-- 2. Ensure balance_owed exists in lead_commissions
ALTER TABLE public.lead_commissions 
ADD COLUMN IF NOT EXISTS balance_owed DECIMAL(10,2);

-- Set initial balance_owed to calculated_amount for existing commissions
UPDATE public.lead_commissions 
SET balance_owed = calculated_amount 
WHERE balance_owed IS NULL;

-- 3. Create/Replace the commission eligibility trigger function (FIXED VERSION)
CREATE OR REPLACE FUNCTION auto_update_commission_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
  v_total_paid DECIMAL(10,2);
  v_commission RECORD;
BEGIN
  -- Only process if payment is not deleted
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
          -- Eligible after any payment (cleared_at is optional, just check payment exists)
          is_eligible := true;
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

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_update_commission_eligibility ON payments;
CREATE TRIGGER trigger_auto_update_commission_eligibility
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_commission_eligibility();

-- 5. Create trigger to auto-create commissions when invoice is created
CREATE OR REPLACE FUNCTION auto_create_commissions_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_lead RECORD;
  v_company_id UUID;
  v_user_ids UUID[];
  v_user_id UUID;
BEGIN
  -- Only process for new invoices
  IF TG_OP = 'INSERT' THEN
    -- Get lead and company info
    SELECT l.*, l.company_id INTO v_lead
    FROM leads l
    WHERE l.id = NEW.lead_id;
    
    IF v_lead IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_company_id := v_lead.company_id;
    
    -- Collect all assigned user IDs
    v_user_ids := ARRAY[]::UUID[];
    
    IF v_lead.sales_rep_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.sales_rep_id);
    END IF;
    
    IF v_lead.marketing_rep_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.marketing_rep_id);
    END IF;
    
    IF v_lead.sales_manager_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.sales_manager_id);
    END IF;
    
    IF v_lead.production_manager_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.production_manager_id);
    END IF;
    
    -- Create commissions for each assigned user
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      -- Check if commission already exists for this user/lead
      IF NOT EXISTS (
        SELECT 1 FROM lead_commissions 
        WHERE lead_id = NEW.lead_id 
        AND user_id = v_user_id 
        AND deleted_at IS NULL
      ) THEN
        -- Get user's commission plan
        DECLARE
          v_plan RECORD;
          v_user RECORD;
          v_base_amount DECIMAL(10,2);
          v_calculated_amount DECIMAL(10,2);
        BEGIN
          -- First get the user to find their commission_plan_id
          SELECT * INTO v_user
          FROM users
          WHERE id = v_user_id
          AND company_id = v_company_id
          AND deleted_at IS NULL;
          
          -- Skip if user not found or has no commission plan
          IF v_user IS NULL OR v_user.commission_plan_id IS NULL THEN
            CONTINUE;
          END IF;
          
          -- Get the commission plan
          SELECT * INTO v_plan
          FROM commission_plans
          WHERE id = v_user.commission_plan_id
          AND company_id = v_company_id
          AND deleted_at IS NULL;
          
          IF v_plan IS NOT NULL THEN
            -- Calculate base amount (invoice total)
            v_base_amount := NEW.total_amount;
            
            -- Calculate commission amount
            IF v_plan.commission_type = 'percentage' THEN
              v_calculated_amount := v_base_amount * (v_plan.commission_rate / 100.0);
            ELSIF v_plan.commission_type = 'flat_amount' THEN
              v_calculated_amount := v_plan.flat_amount;
            ELSE
              v_calculated_amount := 0;
            END IF;
            
            -- Insert commission
            INSERT INTO lead_commissions (
              lead_id,
              user_id,
              company_id,
              commission_plan_id,
              base_amount,
              commission_type,
              commission_rate,
              flat_amount,
              calculated_amount,
              balance_owed,
              paid_amount,
              paid_when,
              status,
              created_by_user_id
            ) VALUES (
              NEW.lead_id,
              v_user_id,
              v_company_id,
              v_plan.id,
              v_base_amount,
              v_plan.commission_type,
              v_plan.commission_rate,
              v_plan.flat_amount,
              v_calculated_amount,
              v_calculated_amount, -- initial balance_owed = calculated_amount
              0, -- paid_amount starts at 0
              v_plan.paid_when,
              'pending', -- initial status
              NULL -- system-generated
            );
            
            RAISE NOTICE 'Auto-created commission for user % on invoice %', v_user_id, NEW.id;
          END IF;
        END;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the invoice trigger
DROP TRIGGER IF EXISTS trigger_auto_create_commissions_on_invoice ON customer_invoices;
CREATE TRIGGER trigger_auto_create_commissions_on_invoice
  AFTER INSERT ON customer_invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commissions_on_invoice();

-- 7. Create trigger to update commissions when change orders are added
CREATE OR REPLACE FUNCTION update_commissions_on_change_order()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_delta DECIMAL(10,2);
  v_commission RECORD;
BEGIN
  -- Only process approved change orders
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'approved')) THEN
    -- Get lead_id from contract
    SELECT lead_id INTO v_lead_id
    FROM contracts
    WHERE id = NEW.contract_id;
    
    IF v_lead_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate delta (change order amount)
    v_delta := NEW.total_amount;
    
    -- Update all non-paid commissions for this lead
    FOR v_commission IN
      SELECT * FROM lead_commissions
      WHERE lead_id = v_lead_id
      AND status IN ('pending', 'eligible', 'approved')
      AND deleted_at IS NULL
    LOOP
      DECLARE
        v_new_calculated DECIMAL(10,2);
        v_new_balance DECIMAL(10,2);
      BEGIN
        -- Recalculate commission based on new amount
        IF v_commission.commission_type = 'percentage' THEN
          v_new_calculated := v_commission.calculated_amount + (v_delta * (v_commission.commission_rate / 100.0));
        ELSE
          -- Flat amount doesn't change with change orders
          v_new_calculated := v_commission.calculated_amount;
        END IF;
        
        -- Calculate new balance owed
        v_new_balance := v_new_calculated - v_commission.paid_amount;
        
        -- Update commission
        UPDATE lead_commissions
        SET
          base_amount = base_amount + v_delta,
          calculated_amount = v_new_calculated,
          balance_owed = v_new_balance,
          updated_at = NOW()
        WHERE id = v_commission.id;
        
        RAISE NOTICE 'Updated commission % for change order %: new calculated=%, new balance=%', 
          v_commission.id, NEW.id, v_new_calculated, v_new_balance;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create the change order trigger
DROP TRIGGER IF EXISTS trigger_update_commissions_on_change_order ON change_orders;
CREATE TRIGGER trigger_update_commissions_on_change_order
  AFTER INSERT OR UPDATE ON change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_commissions_on_change_order();

-- 9. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Commission automation setup complete!';
  RAISE NOTICE '✅ Triggers created:';
  RAISE NOTICE '   1. Auto-update commission eligibility on payment';
  RAISE NOTICE '   2. Auto-create commissions on invoice creation';
  RAISE NOTICE '   3. Update commissions on change order approval';
END $$;
