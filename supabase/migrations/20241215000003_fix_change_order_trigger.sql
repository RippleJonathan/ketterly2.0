-- Fix the change order trigger function to use correct column name
-- The column is 'amount' not 'total'

CREATE OR REPLACE FUNCTION update_contract_price_on_change_order()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id UUID;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    -- Get the contract for this quote
    SELECT id INTO v_contract_id
    FROM public.signed_contracts
    WHERE quote_id = NEW.quote_id
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    -- Update the current contract price
    IF v_contract_id IS NOT NULL THEN
      UPDATE public.signed_contracts
      SET current_contract_price = current_contract_price + NEW.amount,
          updated_at = NOW()
      WHERE id = v_contract_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_contract_price_trigger ON public.change_orders;
CREATE TRIGGER update_contract_price_trigger
  AFTER UPDATE ON public.change_orders
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION update_contract_price_on_change_order();
