-- Drop the problematic trigger that's calling a trigger function incorrectly
-- The trigger_update_commission_from_co trigger calls auto_update_commission_from_estimate()
-- which is a TRIGGER function (RETURNS trigger), not a regular function
-- You cannot call trigger functions with PERFORM - this causes the error:
-- "trigger functions can only be called as triggers"

DROP TRIGGER IF EXISTS trigger_update_commission_from_co ON public.change_orders;

-- The commission logic will need to be refactored later to work properly
-- For now, we're removing it so change orders can be signed
