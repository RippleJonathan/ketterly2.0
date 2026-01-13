-- =====================================================================
-- FIX AUTO-INVOICE TRIGGER TO USE NEW INVOICE NUMBER GENERATION
-- Update the auto_create_invoice_on_contract function to use the new
-- generate_invoice_number() RPC function with proper race condition handling
-- =====================================================================

-- Update function to use new invoice number generation
CREATE OR REPLACE FUNCTION auto_create_invoice_on_contract()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_number TEXT;
  v_invoice_id UUID;
  line_item RECORD;
BEGIN
  -- Only proceed if quote is now 'accepted'
  IF NEW.status != 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Quote % accepted - creating invoice', NEW.id;

  -- Check if invoice already exists for this quote
  IF EXISTS (
    SELECT 1 FROM customer_invoices 
    WHERE quote_id = NEW.id 
    AND deleted_at IS NULL
  ) THEN
    RAISE NOTICE 'Invoice already exists for quote %, skipping', NEW.id;
    RETURN NEW;
  END IF;

  -- Generate invoice number using new RPC function with race condition handling
  SELECT generate_invoice_number(NEW.company_id) INTO v_invoice_number;

  RAISE NOTICE 'Creating invoice with number: %', v_invoice_number;

  -- Create invoice from quote
  INSERT INTO customer_invoices (
    company_id,
    lead_id,
    quote_id,
    invoice_number,
    invoice_date,
    due_date,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    status,
    notes
  )
  VALUES (
    NEW.company_id,
    NEW.lead_id,
    NEW.id,
    v_invoice_number,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days', -- Default 30 days net
    NEW.subtotal,
    NEW.tax_rate,
    NEW.tax_amount,
    NEW.total_amount,
    'sent', -- Default to 'sent' status
    'Auto-generated from accepted quote #' || NEW.quote_number
  )
  RETURNING id INTO v_invoice_id;

  RAISE NOTICE 'Created invoice %', v_invoice_id;

  -- Copy quote line items to invoice line items
  FOR line_item IN (
    SELECT * FROM quote_line_items
    WHERE quote_id = NEW.id
    AND deleted_at IS NULL
    ORDER BY sort_order
  )
  LOOP
    INSERT INTO invoice_line_items (
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      quote_line_item_id,
      sort_order
    )
    VALUES (
      NEW.company_id,
      v_invoice_id,
      line_item.description,
      line_item.quantity,
      line_item.unit_price,
      line_item.id,
      line_item.sort_order
    );
  END LOOP;

  RAISE NOTICE 'Copied % line items to invoice', (SELECT COUNT(*) FROM quote_line_items WHERE quote_id = NEW.id AND deleted_at IS NULL);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_invoice_on_contract IS 'Auto-creates invoice with line items when quote status changes to accepted (contract signed by both parties) - uses generate_invoice_number() for proper race condition handling';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed auto-invoice trigger to use new invoice number generation';
END $$;
