-- Fix: Commission trigger needs to fire on UPDATE too (when totals are calculated)
-- The invoice is created with total=0, then updated when line items are added

DROP TRIGGER IF EXISTS trigger_auto_create_commissions_on_invoice ON public.customer_invoices;

CREATE TRIGGER trigger_auto_create_commissions_on_invoice
  AFTER INSERT OR UPDATE ON public.customer_invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commissions_on_invoice();

-- Note: The trigger function already has logic to prevent duplicate commissions:
-- "IF NOT EXISTS (SELECT 1 FROM lead_commissions WHERE lead_id = NEW.lead_id AND user_id = v_user_id)"
-- This ensures commissions are only created once even if the trigger fires multiple times
