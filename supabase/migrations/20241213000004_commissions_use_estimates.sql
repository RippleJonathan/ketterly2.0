-- =====================================================================
-- UPDATE COMMISSIONS TO USE ESTIMATES
-- Base commissions on estimate + change orders instead of invoices
-- =====================================================================

-- Add column to track which estimate the commission is based on
ALTER TABLE lead_commissions
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_lead_commissions_quote_id 
ON lead_commissions(quote_id) 
WHERE quote_id IS NOT NULL;

-- Update existing commissions to link to the accepted quote for their lead
UPDATE lead_commissions lc
SET quote_id = (
  SELECT q.id
  FROM quotes q
  WHERE q.lead_id = lc.lead_id
  AND q.status IN ('accepted', 'approved')
  AND q.deleted_at IS NULL
  ORDER BY q.created_at DESC
  LIMIT 1
)
WHERE lc.quote_id IS NULL
AND lc.deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN lead_commissions.quote_id IS 'The estimate/quote this commission is based on. Base amount = quote total + change orders.';

-- Function to auto-update commissions when quote or change orders change
CREATE OR REPLACE FUNCTION auto_update_commission_from_estimate()
RETURNS TRIGGER AS $$
DECLARE
  v_commission RECORD;
  v_new_base_amount DECIMAL(10,2);
  v_new_calculated_amount DECIMAL(10,2);
  v_change_orders_total DECIMAL(10,2);
BEGIN
  -- Calculate new base amount (quote + change orders)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_change_orders_total
  FROM change_orders
  WHERE lead_id = NEW.lead_id
  AND status = 'approved'
  AND deleted_at IS NULL;
  
  v_new_base_amount := NEW.total_amount + v_change_orders_total;
  
  -- Update all active commissions for this lead
  FOR v_commission IN
    SELECT 
      id, 
      commission_type, 
      commission_rate, 
      flat_amount,
      paid_amount
    FROM lead_commissions
    WHERE lead_id = NEW.lead_id
    AND status != 'cancelled'
    AND deleted_at IS NULL
  LOOP
    -- Recalculate commission based on new base amount
    IF v_commission.commission_type = 'percentage' THEN
      v_new_calculated_amount := v_new_base_amount * (v_commission.commission_rate / 100);
    ELSIF v_commission.commission_type = 'flat_amount' THEN
      v_new_calculated_amount := v_commission.flat_amount;
    ELSE
      -- Custom - don't auto-update
      CONTINUE;
    END IF;
    
    -- Update commission
    UPDATE lead_commissions
    SET 
      quote_id = NEW.id,
      base_amount = v_new_base_amount,
      calculated_amount = v_new_calculated_amount,
      -- If commission was fully paid but now has a balance, mark as pending
      status = CASE
        WHEN paid_amount >= calculated_amount AND paid_amount < v_new_calculated_amount THEN 'pending'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = v_commission.id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update commissions when quote total changes
DROP TRIGGER IF EXISTS trigger_update_commission_from_estimate ON quotes;
CREATE TRIGGER trigger_update_commission_from_estimate
  AFTER UPDATE OF total_amount ON quotes
  FOR EACH ROW
  WHEN (NEW.status IN ('accepted', 'approved'))
  EXECUTE FUNCTION auto_update_commission_from_estimate();

-- Create trigger to update commissions when change order is approved
CREATE OR REPLACE FUNCTION update_commission_from_change_order()
RETURNS TRIGGER AS $$
DECLARE
  v_quote RECORD;
BEGIN
  -- Get the associated quote
  SELECT id, lead_id, total_amount
  INTO v_quote
  FROM quotes
  WHERE id = NEW.quote_id;
  
  IF v_quote.id IS NOT NULL THEN
    -- Trigger the estimate commission update
    PERFORM auto_update_commission_from_estimate() FROM quotes WHERE id = v_quote.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_commission_from_co ON change_orders;
CREATE TRIGGER trigger_update_commission_from_co
  AFTER UPDATE OF status, amount ON change_orders
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND NEW.quote_id IS NOT NULL)
  EXECUTE FUNCTION update_commission_from_change_order();

COMMENT ON FUNCTION auto_update_commission_from_estimate IS 'Auto-updates commission amounts when estimate (quote) total changes.';
COMMENT ON FUNCTION update_commission_from_change_order IS 'Updates commissions when change order is approved.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Commission system updated to use estimates instead of invoices.';
END $$;
