-- Fix team lead commission trigger - use exact copy of working trigger with ONLY team lead RECORD fix
-- Based on migration 20250113000003 which works correctly

CREATE OR REPLACE FUNCTION auto_create_commissions_on_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_user RECORD;
  v_sales_manager RECORD;
  v_production_manager RECORD;
  v_location_user RECORD;
  v_team RECORD;
  v_commission_amount DECIMAL(10,2);
  v_base_amount DECIMAL(10,2);
  
  -- Team lead specific variables (instead of RECORD for null check)
  v_team_id UUID;
  v_team_lead_id UUID;
  v_team_commission_rate DECIMAL(5,2);
  v_team_paid_when TEXT;
BEGIN
  -- Get lead data
  SELECT * INTO v_lead FROM leads WHERE id = NEW.lead_id;
  
  IF v_lead IS NULL THEN
    RAISE NOTICE 'Lead not found for invoice %', NEW.id;
    RETURN NEW;
  END IF;

  -- Base amount for percentage commissions (can be total or subtotal depending on business rules)
  v_base_amount := NEW.total;

  RAISE NOTICE 'Auto-creating commissions for invoice % (lead: %, amount: $%)', 
    NEW.id, v_lead.id, v_base_amount;

  -- 1. SALES REP COMMISSION
  IF v_lead.sales_rep_id IS NOT NULL THEN
    -- Check if commission already exists
    IF NOT EXISTS (
      SELECT 1 FROM lead_commissions
      WHERE lead_id = NEW.lead_id
      AND user_id = v_lead.sales_rep_id
      AND assignment_field = 'sales_rep_id'
      AND deleted_at IS NULL
    ) THEN
      -- Get user's commission rate
      SELECT u.* INTO v_user
      FROM users u
      WHERE u.id = v_lead.sales_rep_id;

      IF v_user IS NOT NULL THEN
        v_commission_amount := v_base_amount * (COALESCE(v_user.commission_rate, 10) / 100);
        
        IF v_commission_amount > 0 OR COALESCE(v_user.commission_rate, 10) > 0 THEN
          INSERT INTO lead_commissions (
            company_id, lead_id, user_id, assignment_field,
            commission_type, commission_rate, flat_amount,
            calculated_amount, base_amount, paid_when, status,
            notes
          ) VALUES (
            NEW.company_id, NEW.lead_id, v_lead.sales_rep_id, 'sales_rep_id',
            'percentage', COALESCE(v_user.commission_rate, 10), NULL,
            v_commission_amount, v_base_amount, 
            COALESCE(v_user.paid_when, 'when_final_payment'), 'pending',
            'Auto-created: Sales Rep commission from invoice ' || NEW.invoice_number
          );
          RAISE NOTICE 'Created sales_rep commission: $%', v_commission_amount;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 2. MARKETING REP COMMISSION
  IF v_lead.marketing_rep_id IS NOT NULL THEN
    -- Check if commission already exists
    IF NOT EXISTS (
      SELECT 1 FROM lead_commissions
      WHERE lead_id = NEW.lead_id
      AND user_id = v_lead.marketing_rep_id
      AND assignment_field = 'marketing_rep_id'
      AND deleted_at IS NULL
    ) THEN
      SELECT u.* INTO v_user
      FROM users u
      WHERE u.id = v_lead.marketing_rep_id;

      IF v_user IS NOT NULL THEN
        v_commission_amount := v_base_amount * (COALESCE(v_user.marketing_commission_rate, 5) / 100);
        
        IF v_commission_amount > 0 OR COALESCE(v_user.marketing_commission_rate, 5) > 0 THEN
          INSERT INTO lead_commissions (
            company_id, lead_id, user_id, assignment_field,
            commission_type, commission_rate, flat_amount,
            calculated_amount, base_amount, paid_when, status,
            notes
          ) VALUES (
            NEW.company_id, NEW.lead_id, v_lead.marketing_rep_id, 'marketing_rep_id',
            'percentage', COALESCE(v_user.marketing_commission_rate, 5), NULL,
            v_commission_amount, v_base_amount, 
            COALESCE(v_user.paid_when, 'when_final_payment'), 'pending',
            'Auto-created: Marketing Rep commission from invoice ' || NEW.invoice_number
          );
          RAISE NOTICE 'Created marketing_rep commission: $%', v_commission_amount;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 3. SALES MANAGER COMMISSION
  IF v_lead.sales_manager_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lead_commissions
      WHERE lead_id = NEW.lead_id
      AND user_id = v_lead.sales_manager_id
      AND assignment_field = 'sales_manager_id'
      AND deleted_at IS NULL
    ) THEN
      SELECT u.* INTO v_sales_manager
      FROM users u
      WHERE u.id = v_lead.sales_manager_id;

      IF v_sales_manager IS NOT NULL AND v_sales_manager.sales_manager_commission_rate IS NOT NULL THEN
        v_commission_amount := v_base_amount * (v_sales_manager.sales_manager_commission_rate / 100);
        
        IF v_commission_amount > 0 OR v_sales_manager.sales_manager_commission_rate > 0 THEN
          INSERT INTO lead_commissions (
            company_id, lead_id, user_id, assignment_field,
            commission_type, commission_rate, flat_amount,
            calculated_amount, base_amount, paid_when, status,
            notes
          ) VALUES (
            NEW.company_id, NEW.lead_id, v_lead.sales_manager_id, 'sales_manager_id',
            'percentage', v_sales_manager.sales_manager_commission_rate, NULL,
            v_commission_amount, v_base_amount, 
            COALESCE(v_sales_manager.paid_when, 'when_final_payment'), 'pending',
            'Auto-created: Sales Manager commission from invoice ' || NEW.invoice_number
          );
          RAISE NOTICE 'Created sales_manager commission: $%', v_commission_amount;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 4. PRODUCTION MANAGER COMMISSION
  IF v_lead.production_manager_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lead_commissions
      WHERE lead_id = NEW.lead_id
      AND user_id = v_lead.production_manager_id
      AND assignment_field = 'production_manager_id'
      AND deleted_at IS NULL
    ) THEN
      SELECT u.* INTO v_production_manager
      FROM users u
      WHERE u.id = v_lead.production_manager_id;

      IF v_production_manager IS NOT NULL AND v_production_manager.production_manager_commission_rate IS NOT NULL THEN
        v_commission_amount := v_base_amount * (v_production_manager.production_manager_commission_rate / 100);
        
        IF v_commission_amount > 0 OR v_production_manager.production_manager_commission_rate > 0 THEN
          INSERT INTO lead_commissions (
            company_id, lead_id, user_id, assignment_field,
            commission_type, commission_rate, flat_amount,
            calculated_amount, base_amount, paid_when, status,
            notes
          ) VALUES (
            NEW.company_id, NEW.lead_id, v_lead.production_manager_id, 'production_manager_id',
            'percentage', v_production_manager.production_manager_commission_rate, NULL,
            v_commission_amount, v_base_amount, 
            COALESCE(v_production_manager.paid_when, 'when_final_payment'), 'pending',
            'Auto-created: Production Manager commission from invoice ' || NEW.invoice_number
          );
          RAISE NOTICE 'Created production_manager commission: $%', v_commission_amount;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 5. OFFICE MANAGER COMMISSION (location-based)
  IF v_lead.location_id IS NOT NULL THEN
    -- Find office manager at this location with commission enabled
    FOR v_location_user IN (
      SELECT lu.*, u.full_name, u.role
      FROM location_users lu
      JOIN users u ON u.id = lu.user_id
      WHERE lu.location_id = v_lead.location_id
      AND lu.commission_enabled = true
      AND u.role = 'office'
      AND u.deleted_at IS NULL
    )
    LOOP
      -- Check if commission already exists
      IF NOT EXISTS (
        SELECT 1 FROM lead_commissions
        WHERE lead_id = NEW.lead_id
        AND user_id = v_location_user.user_id
        AND assignment_field = 'office_override'
        AND deleted_at IS NULL
      ) THEN
        -- Check include_own_sales flag
        IF v_location_user.include_own_sales OR v_lead.sales_rep_id != v_location_user.user_id THEN
          -- Calculate office commission
          IF v_location_user.commission_type = 'flat_amount' THEN
            v_commission_amount := v_location_user.flat_commission_amount;
          ELSE
            v_commission_amount := v_base_amount * (v_location_user.commission_rate / 100);
          END IF;

          IF v_commission_amount > 0 OR v_location_user.commission_rate > 0 THEN
            INSERT INTO lead_commissions (
              company_id, lead_id, user_id, assignment_field,
              commission_type, commission_rate, flat_amount,
              calculated_amount, base_amount, paid_when, status,
              notes
            ) VALUES (
              NEW.company_id, NEW.lead_id, v_location_user.user_id, 'office_override',
              v_location_user.commission_type, v_location_user.commission_rate, 
              v_location_user.flat_commission_amount,
              v_commission_amount, v_base_amount, 
              COALESCE(v_location_user.paid_when, 'when_final_payment'), 'pending',
              'Auto-created: Office Manager commission from invoice ' || NEW.invoice_number
            );
            RAISE NOTICE 'Created office override commission for %: $%', v_location_user.full_name, v_commission_amount;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 6. TEAM LEAD COMMISSION (if sales rep is on a team) - FIXED VERSION
  IF v_lead.sales_rep_id IS NOT NULL AND v_lead.location_id IS NOT NULL THEN
    -- Use specific variables instead of RECORD type to fix null check issue
    SELECT t.id, t.team_lead_id, t.commission_rate, t.paid_when
    INTO v_team_id, v_team_lead_id, v_team_commission_rate, v_team_paid_when
    FROM location_users lu
    JOIN teams t ON t.id = lu.team_id
    WHERE lu.user_id = v_lead.sales_rep_id
    AND lu.location_id = v_lead.location_id
    AND lu.team_id IS NOT NULL
    AND t.is_active = true
    AND t.team_lead_id IS NOT NULL
    LIMIT 1;

    -- Check if we found a team (check UUID variable, not RECORD)
    IF v_team_lead_id IS NOT NULL THEN
      RAISE NOTICE 'Sales rep on team % with Team Lead: %', v_team_id, v_team_lead_id;
      
      -- Check if team lead commission already exists
      IF NOT EXISTS (
        SELECT 1 FROM lead_commissions
        WHERE lead_id = NEW.lead_id
        AND user_id = v_team_lead_id
        AND assignment_field = 'team_lead_override'
        AND deleted_at IS NULL
      ) THEN
        v_commission_amount := v_base_amount * (COALESCE(v_team_commission_rate, 2) / 100);
        
        IF v_commission_amount > 0 OR COALESCE(v_team_commission_rate, 2) > 0 THEN
          INSERT INTO lead_commissions (
            company_id, lead_id, user_id, assignment_field,
            commission_type, commission_rate, flat_amount,
            calculated_amount, base_amount, paid_when, status,
            notes
          ) VALUES (
            NEW.company_id, NEW.lead_id, v_team_lead_id, 'team_lead_override',
            'percentage', COALESCE(v_team_commission_rate, 2), NULL,
            v_commission_amount, v_base_amount, 
            COALESCE(v_team_paid_when, 'when_final_payment'), 'pending',
            'Auto-created: Team Lead commission from invoice ' || NEW.invoice_number
          );
          RAISE NOTICE 'Created team lead commission: $%', v_commission_amount;
        END IF;
      ELSE
        RAISE NOTICE 'Team lead commission already exists';
      END IF;
    ELSE
      RAISE NOTICE 'Sales rep not on a team or team has no active team lead';
    END IF;
  END IF;

  RAISE NOTICE 'Commission auto-creation complete for invoice %', NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_commissions_on_invoice IS 'Auto-creates commissions for assigned users when invoice is created from contract - Fixed team lead RECORD null check issue';
