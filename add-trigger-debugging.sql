-- Add debugging to commission auto-create trigger

CREATE OR REPLACE FUNCTION auto_create_commissions_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_lead RECORD;
  v_company_id UUID;
  v_user_ids UUID[];
  v_user_id UUID;
BEGIN
  RAISE NOTICE '🔵 [COMMISSION TRIGGER] Starting for invoice %', NEW.id;
  
  -- Only process for new invoices
  IF TG_OP = 'INSERT' THEN
    RAISE NOTICE '🔵 [COMMISSION TRIGGER] Operation is INSERT - proceeding';
    
    -- Get lead and company info
    SELECT l.*, l.company_id INTO v_lead
    FROM leads l
    WHERE l.id = NEW.lead_id;
    
    IF v_lead IS NULL THEN
      RAISE NOTICE '❌ [COMMISSION TRIGGER] Lead not found for lead_id: %', NEW.lead_id;
      RETURN NEW;
    END IF;
    
    RAISE NOTICE '✅ [COMMISSION TRIGGER] Lead found: %, company: %', v_lead.id, v_lead.company_id;
    
    v_company_id := v_lead.company_id;
    
    -- Collect all assigned user IDs
    v_user_ids := ARRAY[]::UUID[];
    
    IF v_lead.sales_rep_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.sales_rep_id);
      RAISE NOTICE '➕ [COMMISSION TRIGGER] Added sales_rep: %', v_lead.sales_rep_id;
    END IF;
    
    IF v_lead.marketing_rep_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.marketing_rep_id);
      RAISE NOTICE '➕ [COMMISSION TRIGGER] Added marketing_rep: %', v_lead.marketing_rep_id;
    END IF;
    
    IF v_lead.sales_manager_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.sales_manager_id);
      RAISE NOTICE '➕ [COMMISSION TRIGGER] Added sales_manager: %', v_lead.sales_manager_id;
    END IF;
    
    IF v_lead.production_manager_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.production_manager_id);
      RAISE NOTICE '➕ [COMMISSION TRIGGER] Added production_manager: %', v_lead.production_manager_id;
    END IF;
    
    RAISE NOTICE '📋 [COMMISSION TRIGGER] Total users to process: %', array_length(v_user_ids, 1);
    
    -- Create commissions for each assigned user
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      RAISE NOTICE '👤 [COMMISSION TRIGGER] Processing user: %', v_user_id;
      
      -- Check if commission already exists for this user/lead
      IF NOT EXISTS (
        SELECT 1 FROM lead_commissions 
        WHERE lead_id = NEW.lead_id 
        AND user_id = v_user_id 
        AND deleted_at IS NULL
      ) THEN
        RAISE NOTICE '✅ [COMMISSION TRIGGER] No existing commission for this user - creating new';
        
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
          
          IF v_user IS NULL THEN
            RAISE NOTICE '❌ [COMMISSION TRIGGER] User not found: %', v_user_id;
            CONTINUE;
          END IF;
          
          RAISE NOTICE '✅ [COMMISSION TRIGGER] User found, commission_plan_id: %', v_user.commission_plan_id;
          
          -- Skip if user not found or has no commission plan
          IF v_user.commission_plan_id IS NULL THEN
            RAISE NOTICE '⚠️ [COMMISSION TRIGGER] User % has no commission plan - skipping', v_user_id;
            CONTINUE;
          END IF;
          
          -- Get the commission plan
          SELECT * INTO v_plan
          FROM commission_plans
          WHERE id = v_user.commission_plan_id
          AND company_id = v_company_id
          AND deleted_at IS NULL;
          
          IF v_plan IS NULL THEN
            RAISE NOTICE '❌ [COMMISSION TRIGGER] Commission plan not found: %', v_user.commission_plan_id;
            CONTINUE;
          END IF;
          
          RAISE NOTICE '✅ [COMMISSION TRIGGER] Plan found: % (%, rate: %, paid_when: %)', 
            v_plan.name, v_plan.commission_type, v_plan.commission_rate, v_plan.paid_when;
          
          -- Calculate base amount (invoice total)
          v_base_amount := NEW.total;
          RAISE NOTICE '💰 [COMMISSION TRIGGER] Base amount: %', v_base_amount;
          
          -- Calculate commission amount
          IF v_plan.commission_type = 'percentage' THEN
            v_calculated_amount := v_base_amount * (v_plan.commission_rate / 100.0);
            RAISE NOTICE '💰 [COMMISSION TRIGGER] Calculated (percentage): %', v_calculated_amount;
          ELSIF v_plan.commission_type = 'flat_amount' THEN
            v_calculated_amount := v_plan.flat_amount;
            RAISE NOTICE '💰 [COMMISSION TRIGGER] Calculated (flat): %', v_calculated_amount;
          ELSE
            v_calculated_amount := 0;
            RAISE NOTICE '⚠️ [COMMISSION TRIGGER] Unknown commission type: %', v_plan.commission_type;
          END IF;
          
          -- Insert commission
          BEGIN
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
            
            RAISE NOTICE '🎉 [COMMISSION TRIGGER] Commission created successfully for user %!', v_user_id;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ [COMMISSION TRIGGER] Error creating commission: %', SQLERRM;
          END;
        END;
      ELSE
        RAISE NOTICE '⚠️ [COMMISSION TRIGGER] Commission already exists for user % - skipping', v_user_id;
      END IF;
    END LOOP;
    
    RAISE NOTICE '🔵 [COMMISSION TRIGGER] Finished processing invoice %', NEW.id;
  ELSE
    RAISE NOTICE '⚠️ [COMMISSION TRIGGER] Operation is % - skipping', TG_OP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Debugging trigger function updated!';
  RAISE NOTICE '   Check Supabase logs after creating an invoice to see detailed trace';
END $$;
