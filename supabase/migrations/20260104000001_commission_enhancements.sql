-- Commission System Enhancements
-- Auto-invoice creation, payment trigger tracking, manual approval workflow,
-- admin management, and full lifecycle tracking

-- =======================
-- 1. ADD NEW COLUMNS TO lead_commissions
-- =======================

-- Payment trigger tracking
ALTER TABLE public.lead_commissions 
ADD COLUMN triggered_by_payment_id UUID REFERENCES payments(id);

-- Approval tracking
ALTER TABLE public.lead_commissions 
ADD COLUMN approved_by_user_id UUID REFERENCES users(id),
ADD COLUMN approved_at TIMESTAMPTZ;

-- Payment tracking
ALTER TABLE public.lead_commissions 
ADD COLUMN paid_date TIMESTAMPTZ,
ADD COLUMN payment_reference TEXT;

-- Add indexes for performance
CREATE INDEX idx_commissions_triggered_by_payment ON lead_commissions(triggered_by_payment_id);
CREATE INDEX idx_commissions_approved_by ON lead_commissions(approved_by_user_id);
CREATE INDEX idx_commissions_status ON lead_commissions(status);

-- Add comment
COMMENT ON COLUMN lead_commissions.triggered_by_payment_id IS 'Payment that triggered commission eligibility (based on paid_when setting)';
COMMENT ON COLUMN lead_commissions.approved_by_user_id IS 'User who approved commission for payment';
COMMENT ON COLUMN lead_commissions.approved_at IS 'Timestamp when commission was approved';
COMMENT ON COLUMN lead_commissions.paid_date IS 'Date when commission was actually paid to user';
COMMENT ON COLUMN lead_commissions.payment_reference IS 'Check number, transaction ID, or other payment reference';

-- =======================
-- 2. ADD NEW PERMISSIONS TO user_permissions
-- =======================

-- Commission management permissions
ALTER TABLE public.user_permissions 
ADD COLUMN can_approve_commissions BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_view_all_commissions BOOLEAN DEFAULT false NOT NULL;

-- Add comments
COMMENT ON COLUMN user_permissions.can_approve_commissions IS 'Can approve commissions for payment (admin/office)';
COMMENT ON COLUMN user_permissions.can_view_all_commissions IS 'Can view all company commissions on admin page (admin/office)';

-- =======================
-- 3. ADD NOTIFICATION TYPES TO user_preferences
-- =======================

-- Commission lifecycle notifications
ALTER TABLE public.user_preferences 
ADD COLUMN commission_eligible BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN commission_approved BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN commission_paid BOOLEAN DEFAULT true NOT NULL;

-- Add comments
COMMENT ON COLUMN user_preferences.commission_eligible IS 'Notify when commission becomes eligible (payment received)';
COMMENT ON COLUMN user_preferences.commission_approved IS 'Notify when commission is approved for payment';
COMMENT ON COLUMN user_preferences.commission_paid IS 'Notify when commission is paid';

-- =======================
-- 4. UPDATE DEFAULT ROLE TEMPLATES
-- =======================

-- Grant new permissions to admin role
UPDATE public.user_permissions 
SET 
  can_approve_commissions = true,
  can_view_all_commissions = true
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'admin'
);

-- Grant new permissions to office role
UPDATE public.user_permissions 
SET 
  can_approve_commissions = true,
  can_view_all_commissions = true
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'office'
);

-- =======================
-- 5. CREATE FUNCTION: Auto-create invoice from signed contract
-- =======================

CREATE OR REPLACE FUNCTION auto_create_invoice_from_signed_contract()
RETURNS TRIGGER AS $$
DECLARE
  v_contract RECORD;
  v_lead RECORD;
  v_invoice_id UUID;
  v_line_item RECORD;
BEGIN
  -- Only proceed if contract is fully signed (has customer and company signatures)
  IF NEW.customer_signature_data IS NOT NULL AND NEW.company_signature_data IS NOT NULL 
     AND (OLD.customer_signature_data IS NULL OR OLD.company_signature_data IS NULL) THEN
    
    -- Get contract details
    SELECT * INTO v_contract FROM signed_contracts WHERE id = NEW.id;
    
    -- Get lead details
    SELECT * INTO v_lead FROM leads WHERE id = v_contract.lead_id;
    
    -- Create invoice with draft status
    INSERT INTO invoices (
      company_id,
      lead_id,
      customer_id,
      invoice_number,
      status,
      issue_date,
      due_date,
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      notes
    ) VALUES (
      v_lead.company_id,
      v_contract.lead_id,
      v_lead.customer_id,
      NULL, -- Will be auto-generated
      'draft', -- Start as draft for manual review
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      v_contract.subtotal,
      v_contract.tax_rate,
      v_contract.tax_amount,
      v_contract.total
    )
    RETURNING id INTO v_invoice_id;
    
    -- Copy line items from contract to invoice
    FOR v_line_item IN 
      SELECT * FROM contract_line_items 
      WHERE contract_id = v_contract.id
      ORDER BY display_order
    LOOP
      INSERT INTO invoice_line_items (
        invoice_id,
        description,
        quantity,
        unit_price,
        total_price,
        display_order
      ) VALUES (
        v_invoice_id,
        v_line_item.description,
        v_line_item.quantity,
        v_line_item.unit_price,
        v_line_item.total_price,
        v_line_item.display_order
      );
    END LOOP;
    
    -- Auto-create commissions for all assigned users
    -- This will be handled by the auto_create_commissions_from_invoice trigger
    
    RAISE NOTICE 'Auto-created draft invoice % from signed contract %', v_invoice_id, v_contract.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_create_invoice_from_signed_contract ON signed_contracts;
CREATE TRIGGER trigger_auto_create_invoice_from_signed_contract
  AFTER UPDATE ON signed_contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_invoice_from_signed_contract();

-- =======================
-- 6. CREATE FUNCTION: Auto-create commissions from invoice
-- =======================

CREATE OR REPLACE FUNCTION auto_create_commissions_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_lead RECORD;
  v_user_id UUID;
  v_plan RECORD;
  v_base_amount DECIMAL(10,2);
  v_commission_amount DECIMAL(10,2);
BEGIN
  -- Only for new invoices
  IF TG_OP = 'INSERT' THEN
    -- Get lead with assigned users
    SELECT * INTO v_lead FROM leads WHERE id = NEW.lead_id;
    
    IF v_lead IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Array of user IDs to create commissions for
    DECLARE
      user_ids UUID[] := ARRAY[
        v_lead.sales_rep_id,
        v_lead.marketing_rep_id,
        v_lead.sales_manager_id,
        v_lead.production_manager_id
      ];
    BEGIN
      -- Loop through each assigned user
      FOREACH v_user_id IN ARRAY user_ids
      LOOP
        -- Skip if user is NULL
        CONTINUE WHEN v_user_id IS NULL;
        
        -- Check if commission already exists for this user and lead
        IF EXISTS (
          SELECT 1 FROM lead_commissions 
          WHERE lead_id = NEW.lead_id 
          AND user_id = v_user_id 
          AND deleted_at IS NULL
        ) THEN
          CONTINUE;
        END IF;
        
        -- Get active commission plan for this user
        SELECT * INTO v_plan 
        FROM commission_plans 
        WHERE company_id = v_lead.company_id
        AND is_active = true
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Skip if no plan found
        CONTINUE WHEN v_plan IS NULL;
        
        -- Calculate base amount based on calculate_on setting
        CASE v_plan.calculate_on
          WHEN 'revenue' THEN
            v_base_amount := NEW.total_amount;
          WHEN 'profit' THEN
            -- Profit = Revenue - Costs (simplified)
            v_base_amount := NEW.total_amount * 0.7; -- Assume 30% cost
          WHEN 'collected' THEN
            v_base_amount := 0; -- Will be updated when payments received
          ELSE
            v_base_amount := NEW.total_amount;
        END CASE;
        
        -- Calculate commission amount
        IF v_plan.commission_type = 'percentage' THEN
          v_commission_amount := v_base_amount * (v_plan.rate / 100);
        ELSE
          v_commission_amount := v_plan.rate; -- flat amount
        END IF;
        
        -- Create commission with pending status
        INSERT INTO lead_commissions (
          lead_id,
          user_id,
          company_id,
          plan_id,
          amount,
          status,
          base_amount,
          balance_owed
        ) VALUES (
          NEW.lead_id,
          v_user_id,
          v_lead.company_id,
          v_plan.id,
          v_commission_amount,
          'pending', -- Pending until payment trigger met
          v_base_amount,
          v_commission_amount -- Balance owed = full amount initially
        );
        
        RAISE NOTICE 'Auto-created commission for user % on lead %', v_user_id, NEW.lead_id;
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_create_commissions_from_invoice ON invoices;
CREATE TRIGGER trigger_auto_create_commissions_from_invoice
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commissions_from_invoice();

-- =======================
-- 7. CREATE FUNCTION: Update commission eligibility on payment
-- =======================

CREATE OR REPLACE FUNCTION auto_update_commission_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice RECORD;
  v_plan RECORD;
  v_total_paid DECIMAL(10,2);
  v_commission RECORD;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id;
  
  -- Calculate total paid on invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id
  AND deleted_at IS NULL;
  
  -- Loop through all pending commissions for this invoice's lead
  FOR v_commission IN 
    SELECT lc.*, cp.paid_when
    FROM lead_commissions lc
    JOIN commission_plans cp ON lc.plan_id = cp.id
    WHERE lc.lead_id = v_invoice.lead_id
    AND lc.status = 'pending'
    AND lc.deleted_at IS NULL
  LOOP
    -- Check if payment trigger is met
    DECLARE
      is_eligible BOOLEAN := false;
    BEGIN
      CASE v_commission.paid_when
        WHEN 'deposit' THEN
          -- Eligible after any payment
          is_eligible := true;
        WHEN 'final' THEN
          -- Eligible when fully paid
          is_eligible := v_total_paid >= v_invoice.total_amount;
        WHEN 'complete' THEN
          -- Eligible when invoice status is 'paid'
          is_eligible := v_invoice.status = 'paid';
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_update_commission_eligibility ON payments;
CREATE TRIGGER trigger_auto_update_commission_eligibility
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_commission_eligibility();

-- =======================
-- 8. CREATE FUNCTION: Recalculate commissions on invoice change
-- =======================

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
      SELECT * INTO v_plan FROM commission_plans WHERE id = v_commission.plan_id;
      
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
      IF v_plan.commission_type = 'percentage' THEN
        v_new_commission_amount := v_new_base_amount * (v_plan.rate / 100);
      ELSE
        v_new_commission_amount := v_plan.rate;
      END IF;
      
      -- Calculate delta (new amount - already paid)
      v_delta := v_new_commission_amount - COALESCE(v_commission.paid_amount, 0);
      
      -- Update commission
      UPDATE lead_commissions
      SET 
        amount = v_new_commission_amount,
        base_amount = v_new_base_amount,
        balance_owed = v_delta,
        -- If amount increased and was previously approved, reset to pending
        status = CASE 
          WHEN v_delta > v_commission.amount - COALESCE(v_commission.paid_amount, 0) 
               AND status = 'approved' 
          THEN 'pending'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = v_commission.id;
      
      RAISE NOTICE 'Recalculated commission % (old: %, new: %, delta: %)', 
        v_commission.id, v_commission.amount, v_new_commission_amount, v_delta;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_recalculate_commissions_on_invoice_change ON invoices;
CREATE TRIGGER trigger_auto_recalculate_commissions_on_invoice_change
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_commissions_on_invoice_change();

-- =======================
-- 9. UPDATE RLS POLICIES
-- =======================

-- Users with can_view_all_commissions can see all company commissions
DROP POLICY IF EXISTS "Users can view all company commissions with permission" ON lead_commissions;
CREATE POLICY "Users can view all company commissions with permission"
  ON lead_commissions
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      -- Own commissions
      user_id = auth.uid()
      OR
      -- Users with can_view_all_commissions permission
      EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
        AND can_view_all_commissions = true
      )
    )
  );

-- Users with can_approve_commissions can update commission status
DROP POLICY IF EXISTS "Users can approve commissions with permission" ON lead_commissions;
CREATE POLICY "Users can approve commissions with permission"
  ON lead_commissions
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND can_approve_commissions = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- =======================
-- 10. ADD HELPFUL INDEXES
-- =======================

-- Index for admin commission page queries
CREATE INDEX idx_commissions_company_status ON lead_commissions(company_id, status) 
  WHERE deleted_at IS NULL;

-- Index for user's own commissions
CREATE INDEX idx_commissions_user_status ON lead_commissions(user_id, status) 
  WHERE deleted_at IS NULL;

-- Index for filtering by date
CREATE INDEX idx_commissions_created_at ON lead_commissions(created_at DESC);

-- =======================
-- MIGRATION COMPLETE
-- =======================

-- Add migration note
COMMENT ON TABLE lead_commissions IS 
  'Lead commissions with payment tracking, approval workflow, and admin management. Enhanced Jan 4, 2026.';
