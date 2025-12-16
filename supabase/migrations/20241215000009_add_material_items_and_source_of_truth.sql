-- =====================================================================
-- Add Material Items to Change Orders & Contract Source of Truth
-- =====================================================================

-- Add material_id to change_order_line_items for linking to materials database
ALTER TABLE public.change_order_line_items
ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_change_order_line_items_material_id 
ON public.change_order_line_items(material_id);

COMMENT ON COLUMN public.change_order_line_items.material_id IS 'Optional link to material from database';

-- Add current_total_with_change_orders to signed_contracts
-- This is the SINGLE SOURCE OF TRUTH for contract value
ALTER TABLE public.signed_contracts
ADD COLUMN IF NOT EXISTS current_total_with_change_orders NUMERIC(10,2);

-- Backfill with current calculated value
UPDATE public.signed_contracts
SET current_total_with_change_orders = (
  original_contract_price + COALESCE((
    SELECT SUM(total)
    FROM change_orders
    WHERE quote_id = signed_contracts.quote_id
      AND status = 'approved'
      AND deleted_at IS NULL
  ), 0)
)
WHERE current_total_with_change_orders IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.signed_contracts
ALTER COLUMN current_total_with_change_orders SET NOT NULL;

-- Update the trigger to maintain this field
CREATE OR REPLACE FUNCTION update_contract_total_on_change_order()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id UUID;
  v_original_price NUMERIC(10,2);
  v_total_change_orders NUMERIC(10,2);
BEGIN
  -- Only process when status changes to 'approved' OR when an approved CO is deleted/restored
  IF (NEW.status = 'approved' AND OLD.status != 'approved') 
     OR (NEW.status != 'approved' AND OLD.status = 'approved')
     OR (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NEW.status = 'approved') THEN
    
    -- Get the contract for this quote
    SELECT id, original_contract_price INTO v_contract_id, v_original_price
    FROM public.signed_contracts
    WHERE quote_id = NEW.quote_id
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    -- Calculate total approved change orders
    SELECT COALESCE(SUM(total), 0) INTO v_total_change_orders
    FROM public.change_orders
    WHERE quote_id = NEW.quote_id
      AND status = 'approved'
      AND deleted_at IS NULL;

    -- Update the source of truth fields
    IF v_contract_id IS NOT NULL THEN
      UPDATE public.signed_contracts
      SET 
        current_contract_price = v_original_price + v_total_change_orders,
        current_total_with_change_orders = v_original_price + v_total_change_orders,
        updated_at = NOW()
      WHERE id = v_contract_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS update_contract_price_trigger ON public.change_orders;
DROP TRIGGER IF EXISTS update_contract_total_trigger ON public.change_orders;

CREATE TRIGGER update_contract_total_trigger
  AFTER UPDATE OR DELETE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_total_on_change_order();

-- Also handle when change orders are inserted
CREATE TRIGGER update_contract_total_on_insert_trigger
  AFTER INSERT ON public.change_orders
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION update_contract_total_on_change_order();

COMMENT ON COLUMN public.signed_contracts.current_total_with_change_orders IS 'SINGLE SOURCE OF TRUTH: Original contract + all approved change orders. Auto-updated by triggers.';
COMMENT ON TRIGGER update_contract_total_trigger ON public.change_orders IS 'Maintains the source of truth contract total when change orders are approved/modified/deleted';
COMMENT ON TRIGGER update_contract_total_on_insert_trigger ON public.change_orders IS 'Maintains the source of truth contract total when approved change orders are created';
