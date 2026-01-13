-- Improve generate_invoice_number function to handle race conditions
-- This ensures we always get a unique invoice number even if multiple invoices are created simultaneously

CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_next_num INTEGER;
  v_invoice_number TEXT;
  v_exists BOOLEAN;
  v_max_attempts INTEGER := 100; -- Prevent infinite loop
  v_attempts INTEGER := 0;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the highest invoice number for this year (ONCE, outside the loop)
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
  AND deleted_at IS NULL;
  
  LOOP
    -- Generate the invoice number
    v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
    
    -- Check if this number already exists (handles race conditions)
    -- Check ALL invoices including soft-deleted ones because unique constraint applies to all
    SELECT EXISTS(
      SELECT 1 FROM customer_invoices 
      WHERE invoice_number = v_invoice_number 
      AND company_id = p_company_id
      -- Don't filter by deleted_at here - unique constraint applies to all rows
    ) INTO v_exists;
    
    -- If doesn't exist, we're good!
    IF NOT v_exists THEN
      RETURN v_invoice_number;
    END IF;
    
    -- Safety check to prevent infinite loop
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique invoice number after % attempts', v_max_attempts;
    END IF;
    
    -- Otherwise, increment and try again
    v_next_num := v_next_num + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_invoice_number(UUID) IS 'Generates next sequential invoice number for company in format INV-YYYY-0001, handles race conditions';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
