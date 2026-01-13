-- =====================================================================
-- FIX DUPLICATE INVOICE NUMBER INV-02027
-- This cleans up the duplicate invoice that was created with old format
-- =====================================================================

-- First, let's see what we have
SELECT 
  id,
  invoice_number,
  lead_id,
  quote_id,
  total,
  status,
  created_at
FROM customer_invoices
WHERE invoice_number LIKE 'INV-02%'
ORDER BY created_at DESC;

-- If you see INV-02027 and want to delete it (assuming it's a duplicate):
-- DELETE FROM customer_invoices WHERE invoice_number = 'INV-02027' AND deleted_at IS NULL;

-- Or soft delete it:
-- UPDATE customer_invoices SET deleted_at = NOW() WHERE invoice_number = 'INV-02027' AND deleted_at IS NULL;
