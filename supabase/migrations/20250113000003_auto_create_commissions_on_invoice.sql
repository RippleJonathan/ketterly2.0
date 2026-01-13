-- =====================================================================
-- AUTO-CREATE COMMISSIONS WHEN INVOICE IS CREATED
-- When invoice is created from contract acceptance, auto-create commissions
-- for assigned users (sales_rep, marketing_rep, sales_manager, production_manager)
-- and office/team lead overrides
-- =====================================================================

-- Function to auto-create commissions when invoice is inserted
CREATE OR REPLACE FUNCTION auto_create_commissions_on_invoice()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead RECORD;
  v_user RECORD;
  v_location_user RECORD;
  v_team RECORD;
  v_base_amount NUMERIC;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_commission_type TEXT;
  v_flat_amount NUMERIC;
  v_paid_when TEXT;
BEGIN
  RAISE NOTICE 'Auto-creating commissions for invoice %', NEW.id;

  -- Get lead data with all assigned users
  SELECT * INTO v_lead
  FROM leads
  WHERE id = NEW.lead_id;

  IF v_lead IS NULL THEN
    RAISE NOTICE 'Lead % not found, skipping commission creation', NEW.lead_id;
    RETURN NEW;
  END IF;

  -- Set base amount from invoice total
  v_base_amount := NEW.total;

  -- Helper function to create commission for a user
  CREATE TEMP TABLE IF NOT EXISTS temp_commissions_to_create (
    user_id UUID,
    assignment_field TEXT,
    commission_type TEXT,
    commission_rate NUMERIC,
    flat_amount NUMERIC,
    calculated_amount NUMERIC,
    paid_when TEXT
  );

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
      -- Get commission config (location override or user settings)
      SELECT 
        COALESCE(lu.commission_type, u.sales_commission_type, 'percentage') as commission_type,
        COALESCE(lu.commission_rate, u.sales_commission_rate, 0) as commission_rate,
        COALESCE(lu.flat_commission_amount, u.sales_flat_amount, 0) as flat_amount,
        COALESCE(lu.paid_when, 'when_final_payment') as paid_when
      INTO v_commission_type, v_commission_rate, v_flat_amount, v_paid_when
      FROM users u
      LEFT JOIN location_users lu ON lu.user_id = u.id 
        AND lu.location_id = v_lead.location_id 
        AND lu.commission_enabled = true
      WHERE u.id = v_lead.sales_rep_id;

      -- Calculate commission amount
      IF v_commission_type = 'percentage' THEN
        v_commission_amount := v_base_amount * (v_commission_rate / 100);
      ELSE
        v_commission_amount := v_flat_amount;
      END IF;

      -- Create commission
      IF v_commission_rate > 0 OR v_flat_amount > 0 THEN
        INSERT INTO lead_commissions (
          company_id, lead_id, user_id, assignment_field,
          commission_type, commission_rate, flat_amount,
          calculated_amount, base_amount, paid_when, status,
          notes
        ) VALUES (
          NEW.company_id, NEW.lead_id, v_lead.sales_rep_id, 'sales_rep_id',
          v_commission_type, v_commission_rate, v_flat_amount,
          v_commission_amount, v_base_amount, v_paid_when, 'pending',
          'Auto-created from invoice ' || NEW.invoice_number
        );
        RAISE NOTICE 'Created sales_rep commission: $%', v_commission_amount;
      END IF;
    END IF;
  END IF;

  -- 2. MARKETING REP COMMISSION
  IF v_lead.marketing_rep_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lead_commissions
      WHERE lead_id = NEW.lead_id
      AND user_id = v_lead.marketing_rep_id
      AND assignment_field = 'marketing_rep_id'
      AND deleted_at IS NULL
    ) THEN
      SELECT 
        COALESCE(lu.commission_type, u.marketing_commission_type, 'percentage') as commission_type,
        COALESCE(lu.commission_rate, u.marketing_commission_rate, 0) as commission_rate,
        COALESCE(lu.flat_commission_amount, u.marketing_flat_amount, 0) as flat_amount,
        COALESCE(lu.paid_when, 'when_final_payment') as paid_when
      INTO v_commission_type, v_commission_rate, v_flat_amount, v_paid_when
      FROM users u
      LEFT JOIN location_users lu ON lu.user_id = u.id 
        AND lu.location_id = v_lead.location_id 
        AND lu.commission_enabled = true
      WHERE u.id = v_lead.marketing_rep_id;

      IF v_commission_type = 'percentage' THEN
        v_commission_amount := v_base_amount * (v_commission_rate / 100);
      ELSE
        v_commission_amount := v_flat_amount;
      END IF;

      IF v_commission_rate > 0 OR v_flat_amount > 0 THEN
        INSERT INTO lead_commissions (
          company_id, lead_id, user_id, assignment_field,
          commission_type, commission_rate, flat_amount,
          calculated_amount, base_amount, paid_when, status,
          notes
        ) VALUES (
          NEW.company_id, NEW.lead_id, v_lead.marketing_rep_id, 'marketing_rep_id',
          v_commission_type, v_commission_rate, v_flat_amount,
          v_commission_amount, v_base_amount, v_paid_when, 'pending',
          'Auto-created from invoice ' || NEW.invoice_number
        );
        RAISE NOTICE 'Created marketing_rep commission: $%', v_commission_amount;
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
      SELECT 
        COALESCE(u.sales_commission_type, 'percentage') as commission_type,
        COALESCE(u.sales_commission_rate, 0) as commission_rate,
        COALESCE(u.sales_flat_amount, 0) as flat_amount
      INTO v_commission_type, v_commission_rate, v_flat_amount
      FROM users u
      WHERE u.id = v_lead.sales_manager_id;

      IF v_commission_type = 'percentage' THEN
        v_commission_amount := v_base_amount * (v_commission_rate / 100);
      ELSE
        v_commission_amount := v_flat_amount;
      END IF;

      IF v_commission_rate > 0 OR v_flat_amount > 0 THEN
        INSERT INTO lead_commissions (
          company_id, lead_id, user_id, assignment_field,
          commission_type, commission_rate, flat_amount,
          calculated_amount, base_amount, paid_when, status,
          notes
        ) VALUES (
          NEW.company_id, NEW.lead_id, v_lead.sales_manager_id, 'sales_manager_id',
          v_commission_type, v_commission_rate, v_flat_amount,
          v_commission_amount, v_base_amount, 'when_final_payment', 'pending',
          'Auto-created from invoice ' || NEW.invoice_number
        );
        RAISE NOTICE 'Created sales_manager commission: $%', v_commission_amount;
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
      SELECT 
        COALESCE(u.production_commission_type, 'percentage') as commission_type,
        COALESCE(u.production_commission_rate, 0) as commission_rate,
        COALESCE(u.production_flat_amount, 0) as flat_amount
      INTO v_commission_type, v_commission_rate, v_flat_amount
      FROM users u
      WHERE u.id = v_lead.production_manager_id;

      IF v_commission_type = 'percentage' THEN
        v_commission_amount := v_base_amount * (v_commission_rate / 100);
      ELSE
        v_commission_amount := v_flat_amount;
      END IF;

      IF v_commission_rate > 0 OR v_flat_amount > 0 THEN
        INSERT INTO lead_commissions (
          company_id, lead_id, user_id, assignment_field,
          commission_type, commission_rate, flat_amount,
          calculated_amount, base_amount, paid_when, status,
          notes
        ) VALUES (
          NEW.company_id, NEW.lead_id, v_lead.production_manager_id, 'production_manager_id',
          v_commission_type, v_commission_rate, v_flat_amount,
          v_commission_amount, v_base_amount, 'when_final_payment', 'pending',
          'Auto-created from invoice ' || NEW.invoice_number
        );
        RAISE NOTICE 'Created production_manager commission: $%', v_commission_amount;
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

  -- 6. TEAM LEAD COMMISSION (if sales rep is on a team)
  IF v_lead.sales_rep_id IS NOT NULL AND v_lead.location_id IS NOT NULL THEN
    -- Check if sales rep is on a team
    SELECT t.* INTO v_team
    FROM location_users lu
    JOIN teams t ON t.id = lu.team_id
    WHERE lu.user_id = v_lead.sales_rep_id
    AND lu.location_id = v_lead.location_id
    AND lu.team_id IS NOT NULL
    AND t.is_active = true
    AND t.team_lead_id IS NOT NULL
    LIMIT 1;

    IF v_team IS NOT NULL THEN
      -- Check if team lead commission already exists
      IF NOT EXISTS (
        SELECT 1 FROM lead_commissions
        WHERE lead_id = NEW.lead_id
        AND user_id = v_team.team_lead_id
        AND assignment_field = 'team_lead_override'
        AND deleted_at IS NULL
      ) THEN
        v_commission_amount := v_base_amount * (v_team.commission_rate / 100);
        
        IF v_commission_amount > 0 OR v_team.commission_rate > 0 THEN
          INSERT INTO lead_commissions (
            company_id, lead_id, user_id, assignment_field,
            commission_type, commission_rate, flat_amount,
            calculated_amount, base_amount, paid_when, status,
            notes
          ) VALUES (
            NEW.company_id, NEW.lead_id, v_team.team_lead_id, 'team_lead_override',
            'percentage', v_team.commission_rate, NULL,
            v_commission_amount, v_base_amount, 
            COALESCE(v_team.paid_when, 'when_final_payment'), 'pending',
            'Auto-created: Team Lead commission from invoice ' || NEW.invoice_number
          );
          RAISE NOTICE 'Created team lead commission: $%', v_commission_amount;
        END IF;
      END IF;
    END IF;
  END IF;

  RAISE NOTICE 'Commission auto-creation complete for invoice %', NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_commissions_on_invoice IS 'Auto-creates commissions for assigned users when invoice is created from contract';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_commissions_on_invoice ON customer_invoices;

-- Create trigger on customer_invoices table
CREATE TRIGGER trigger_auto_create_commissions_on_invoice
  AFTER INSERT ON customer_invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commissions_on_invoice();

COMMENT ON TRIGGER trigger_auto_create_commissions_on_invoice ON customer_invoices IS 'Auto-creates commissions when invoice is inserted';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-commission trigger on invoice creation installed';
END $$;
