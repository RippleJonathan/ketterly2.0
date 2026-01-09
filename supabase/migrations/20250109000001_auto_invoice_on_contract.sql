-- =====================================================================
-- AUTO-CREATE INVOICE ON CONTRACT ACCEPTANCE
-- When both customer and company sign the quote, auto-create invoice
-- =====================================================================

-- Function to auto-create invoice when quote is accepted
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

  -- Generate invoice number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO v_invoice_number
  FROM customer_invoices
  WHERE company_id = NEW.company_id
  AND deleted_at IS NULL;

  v_invoice_number := 'INV-' || LPAD(v_invoice_number::TEXT, 5, '0');

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

COMMENT ON FUNCTION auto_create_invoice_on_contract IS 'Auto-creates invoice with line items when quote status changes to accepted (contract signed by both parties)';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_invoice_on_contract ON quotes;

-- Create trigger on quotes table
CREATE TRIGGER trigger_auto_create_invoice_on_contract
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted')
  EXECUTE FUNCTION auto_create_invoice_on_contract();

COMMENT ON TRIGGER trigger_auto_create_invoice_on_contract ON quotes IS 'Auto-creates invoice when quote is accepted (both signatures complete)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Invoice auto-creation on contract acceptance installed';
  RAISE NOTICE 'When quote.status changes to "accepted", invoice will be auto-created';
  RAISE NOTICE 'Invoice creation triggers commission auto-creation via application code';
END $$;
