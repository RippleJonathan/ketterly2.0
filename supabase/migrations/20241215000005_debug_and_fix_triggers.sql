-- Check if the problematic columns exist and drop the trigger completely
-- This is a diagnostic and fix script

-- First, check what triggers exist on change_orders
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'change_orders';

-- Drop ALL triggers on change_orders to debug
DROP TRIGGER IF EXISTS update_contract_price_trigger ON public.change_orders;
DROP TRIGGER IF EXISTS update_change_orders_updated_at ON public.change_orders;

-- Recreate only the updated_at trigger (safe one)
CREATE TRIGGER update_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Check if the problematic columns exist in signed_contracts
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'signed_contracts' 
AND column_name IN ('original_contract_price', 'current_contract_price');

-- If they don't exist, we need to add them
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'signed_contracts' AND column_name = 'original_contract_price'
--   ) THEN
--     ALTER TABLE public.signed_contracts ADD COLUMN original_contract_price NUMERIC(10,2);
--     ALTER TABLE public.signed_contracts ADD COLUMN current_contract_price NUMERIC(10,2);
    
--     -- Backfill with original_total
--     UPDATE public.signed_contracts
--     SET 
--       original_contract_price = original_total,
--       current_contract_price = original_total
--     WHERE original_contract_price IS NULL;
    
--     ALTER TABLE public.signed_contracts ALTER COLUMN original_contract_price SET NOT NULL;
--     ALTER TABLE public.signed_contracts ALTER COLUMN current_contract_price SET NOT NULL;
--   END IF;
-- END $$;
