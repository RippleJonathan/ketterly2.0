-- =============================================
-- FIX: Invoice status should only auto-update when amount_paid changes
-- NOT when total changes from editing line items
-- =============================================

-- Drop the old trigger
DROP TRIGGER IF EXISTS auto_update_invoice_status ON public.customer_invoices;

-- Update the function to only run when amount_paid changes
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-update status when amount_paid changes (from payment recording)
  -- NOT when total changes (from editing line items)
  IF OLD.amount_paid IS DISTINCT FROM NEW.amount_paid THEN
    IF NEW.amount_paid >= NEW.total THEN
      NEW.status = 'paid';
    ELSIF NEW.amount_paid > 0 THEN
      NEW.status = 'partial';
    ELSIF NEW.amount_paid = 0 AND NEW.status IN ('paid', 'partial') THEN
      -- If all payments removed, revert to sent or draft
      IF NEW.sent_at IS NOT NULL THEN
        NEW.status = 'sent';
      ELSE
        NEW.status = 'draft';
      END IF;
    END IF;
  END IF;
  
  -- Check for overdue status (only if not paid/cancelled/void)
  IF NEW.due_date IS NOT NULL 
    AND NEW.due_date < CURRENT_DATE 
    AND NEW.status NOT IN ('paid', 'cancelled', 'void') THEN
    NEW.status = 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger - only fires when amount_paid changes
CREATE TRIGGER auto_update_invoice_status
  BEFORE UPDATE ON public.customer_invoices
  FOR EACH ROW
  WHEN (OLD.amount_paid IS DISTINCT FROM NEW.amount_paid)
  EXECUTE FUNCTION update_invoice_status();

COMMENT ON FUNCTION update_invoice_status IS 'Auto-updates invoice status only when amount_paid changes (from payments), not when total changes from editing line items';
COMMENT ON TRIGGER auto_update_invoice_status ON public.customer_invoices IS 'Only fires when amount_paid changes to prevent status changes during line item editing';
