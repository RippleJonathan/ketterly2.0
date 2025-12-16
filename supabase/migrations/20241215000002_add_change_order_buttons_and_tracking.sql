-- =====================================================================
-- Add Change Order Action Buttons and Contract Price Tracking
-- =====================================================================

-- Add original_contract_price to track the initial signed contract amount
-- This allows us to show: Original → Current → Change → New Contract Price
ALTER TABLE public.signed_contracts
ADD COLUMN IF NOT EXISTS original_contract_price NUMERIC(10,2);

-- Backfill original_contract_price with original_total for existing contracts
UPDATE public.signed_contracts
SET original_contract_price = original_total
WHERE original_contract_price IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.signed_contracts
ALTER COLUMN original_contract_price SET NOT NULL;

-- Add current_contract_price to track the running total with approved change orders
ALTER TABLE public.signed_contracts
ADD COLUMN IF NOT EXISTS current_contract_price NUMERIC(10,2);

-- Backfill current_contract_price
UPDATE public.signed_contracts
SET current_contract_price = original_total
WHERE current_contract_price IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.signed_contracts
ALTER COLUMN current_contract_price SET NOT NULL;

-- Function to update contract price when change order is approved
CREATE OR REPLACE FUNCTION update_contract_price_on_change_order()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id UUID;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
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
      SET current_contract_price = current_contract_price + NEW.total,
          updated_at = NOW()
      WHERE id = v_contract_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update contract price
DROP TRIGGER IF EXISTS update_contract_price_trigger ON public.change_orders;
CREATE TRIGGER update_contract_price_trigger
  AFTER UPDATE ON public.change_orders
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION update_contract_price_on_change_order();

-- Add comment
COMMENT ON COLUMN public.signed_contracts.original_contract_price IS 'The original signed contract amount (never changes)';
COMMENT ON COLUMN public.signed_contracts.current_contract_price IS 'The current contract price including all approved change orders';
COMMENT ON TRIGGER update_contract_price_trigger ON public.change_orders IS 'Automatically updates contract price when change order is approved';
