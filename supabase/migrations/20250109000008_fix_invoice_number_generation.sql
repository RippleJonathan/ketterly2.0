-- Fix generate_invoice_number function to filter by deleted_at
-- This ensures invoice numbers are generated correctly after adding deleted_at column

CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_next_num INTEGER;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the highest invoice number for this year (excluding deleted invoices)
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ ('^INV-' || v_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(invoice_number FROM LENGTH('INV-' || v_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_next_num
  FROM customer_invoices
  WHERE company_id = p_company_id
  AND deleted_at IS NULL;  -- Filter out soft-deleted invoices
  
  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_invoice_number(UUID) IS 'Generates next sequential invoice number for company in format INV-YYYY-0001';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
