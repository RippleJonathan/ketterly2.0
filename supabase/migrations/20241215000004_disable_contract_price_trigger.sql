-- Temporarily disable the trigger to allow signing to work
DROP TRIGGER IF EXISTS update_contract_price_trigger ON public.change_orders;

-- We'll add it back after debugging
