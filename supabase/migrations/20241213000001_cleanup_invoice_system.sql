-- =====================================================================
-- CLEANUP: Remove Invoice Auto-Creation System
-- Switch to simpler estimate-centric approach
-- =====================================================================

-- Drop all invoice auto-creation triggers
DROP TRIGGER IF EXISTS trigger_auto_create_invoice_from_quote ON quotes;
DROP TRIGGER IF EXISTS trigger_auto_update_invoice_from_change_order ON change_orders;
DROP TRIGGER IF EXISTS trigger_recalculate_invoice_totals ON invoice_line_items;
DROP TRIGGER IF EXISTS trigger_auto_update_commission_from_invoice ON customer_invoices;

-- Drop all invoice auto-creation functions
DROP FUNCTION IF EXISTS auto_create_invoice_from_quote();
DROP FUNCTION IF EXISTS auto_update_invoice_from_change_order();
DROP FUNCTION IF EXISTS recalculate_invoice_totals();
DROP FUNCTION IF EXISTS auto_update_commission_from_invoice();

COMMENT ON TABLE customer_invoices IS 'DEPRECATED - Invoices are now generated as PDFs from estimates. This table kept for historical data only.';
COMMENT ON TABLE invoice_line_items IS 'DEPRECATED - Line items now managed in quote_line_items. This table kept for historical data only.';
COMMENT ON TABLE payments IS 'Active - Payments still tracked here and linked to leads (not invoices).';

-- Mark existing invoice/payment tables as deprecated in comments
-- We'll keep them for now in case there's historical data
-- But new invoices won't be created in these tables

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Invoice auto-creation system removed. Estimates are now the source of truth.';
END $$;
