-- Fix invoice trigger to fire when customer signs (not just when fully accepted)
-- This creates the invoice as soon as the customer signs, before company signature

CREATE OR REPLACE FUNCTION auto_create_invoice_from_quote()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_next_number INTEGER;
  v_line_items_added INTEGER;
  v_max_sort_order INTEGER;
BEGIN
  -- Create invoice when quote status changes to any of these:
  -- 'accepted', 'approved', OR 'pending_company_signature' (customer signed)
  IF NEW.status IN ('accepted', 'approved', 'pending_company_signature') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'approved', 'pending_company_signature')) THEN
    
    BEGIN
      -- Check if this quote's line items are already on an invoice
      IF EXISTS (
        SELECT 1 FROM invoice_line_items ili
        JOIN customer_invoices ci ON ili.invoice_id = ci.id
        WHERE ili.quote_line_item_id IN (
          SELECT id FROM quote_line_items WHERE quote_id = NEW.id
        )
        AND ci.deleted_at IS NULL
      ) THEN
        RAISE NOTICE 'Quote % line items already on invoice, skipping', NEW.id;
        RETURN NEW;
      END IF;
      
      -- Check if invoice already exists for this lead (from another quote)
      SELECT id INTO v_invoice_id
      FROM customer_invoices
      WHERE lead_id = NEW.lead_id
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- If no invoice exists, create one
      IF v_invoice_id IS NULL THEN
        -- Generate invoice number
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+') AS INTEGER)), 0) + 1
        INTO v_next_number
        FROM customer_invoices
        WHERE company_id = NEW.company_id
        AND invoice_number ~ '^INV-[0-9]+$';
        
        v_invoice_number := 'INV-' || LPAD(v_next_number::TEXT, 5, '0');
        
        -- Create invoice
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
          status
        ) VALUES (
          NEW.company_id,
          NEW.lead_id,
          NEW.id,
          v_invoice_number,
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '30 days',
          NEW.subtotal,
          NEW.tax_rate,
          NEW.tax_amount,
          NEW.total_amount,
          'draft'
        )
        RETURNING id INTO v_invoice_id;
        
        RAISE NOTICE 'Auto-created invoice % for quote %', v_invoice_number, NEW.id;
      ELSE
        RAISE NOTICE 'Adding quote % to existing invoice %', NEW.id, v_invoice_id;
      END IF;
      
      -- Get max sort order for existing line items
      SELECT COALESCE(MAX(sort_order), 0)
      INTO v_max_sort_order
      FROM invoice_line_items
      WHERE invoice_id = v_invoice_id;
      
      -- Copy quote line items to invoice line items
      -- Add to existing invoice with incremented sort order
      INSERT INTO invoice_line_items (
        company_id,
        invoice_id,
        description,
        quantity,
        unit_price,
        quote_line_item_id,
        sort_order
      )
      SELECT
        qli.company_id,
        v_invoice_id,
        qli.description,
        qli.quantity,
        qli.unit_price,
        qli.id,
        v_max_sort_order + ROW_NUMBER() OVER (ORDER BY qli.sort_order)
      FROM quote_line_items qli
      WHERE qli.quote_id = NEW.id
      AND qli.deleted_at IS NULL
      ORDER BY qli.sort_order;
      
      GET DIAGNOSTICS v_line_items_added = ROW_COUNT;
      RAISE NOTICE 'Added % line items from quote % to invoice %', v_line_items_added, NEW.id, v_invoice_id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error creating invoice from quote %: % %', NEW.id, SQLERRM, SQLSTATE;
        -- Don't fail the quote update, just log the error
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_invoice_from_quote IS 'Automatically create invoice when customer signs quote (pending_company_signature, accepted, or approved status)';
