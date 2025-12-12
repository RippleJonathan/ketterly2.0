-- Fix invoice trigger to bypass RLS using SECURITY DEFINER
-- This allows the trigger to insert invoices even when RLS is enabled

-- =============================================================================
-- FUNCTION: Auto-create invoice when quote is accepted (WITH SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_create_invoice_from_quote()
RETURNS TRIGGER 
SECURITY DEFINER -- This makes the function run with the permissions of the owner
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
  -- Only create invoice when quote status changes to 'accepted' or 'approved'
  IF NEW.status IN ('accepted', 'approved') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'approved')) THEN
    
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

-- =============================================================================
-- FUNCTION: Auto-update invoice from change order (WITH SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_update_invoice_from_change_order()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_line_item_exists BOOLEAN;
BEGIN
  -- Only process when change order status changes to 'approved'
  IF NEW.status = 'approved' AND 
     (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Find the invoice for this lead
    SELECT id INTO v_invoice_id
    FROM customer_invoices
    WHERE lead_id = NEW.lead_id
    AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_invoice_id IS NULL THEN
      RAISE NOTICE 'No invoice found for lead % - change order % not added', NEW.lead_id, NEW.id;
      RETURN NEW;
    END IF;
    
    -- Check if this change order is already on the invoice
    SELECT EXISTS (
      SELECT 1 FROM invoice_line_items
      WHERE invoice_id = v_invoice_id
      AND change_order_id = NEW.id
    ) INTO v_line_item_exists;
    
    IF v_line_item_exists THEN
      RAISE NOTICE 'Change order % already exists on invoice %', NEW.id, v_invoice_id;
      RETURN NEW;
    END IF;
    
    -- Add change order as line item to invoice
    INSERT INTO invoice_line_items (
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      change_order_id,
      sort_order
    ) VALUES (
      NEW.company_id,
      v_invoice_id,
      NEW.description || ' (Change Order ' || NEW.change_order_number || ')',
      1,
      NEW.amount,
      NEW.id,
      (
        SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM invoice_line_items
        WHERE invoice_id = v_invoice_id
      )
    );
    
    RAISE NOTICE 'Added change order % to invoice %', NEW.change_order_number, v_invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- FUNCTION: Recalculate invoice totals (WITH SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal DECIMAL(10,2);
  v_tax_rate DECIMAL(5,4);
  v_tax_amount DECIMAL(10,2);
  v_new_total DECIMAL(10,2);
BEGIN
  -- Get the invoice ID from the trigger operation
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Calculate new subtotal from all line items
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  INTO v_subtotal
  FROM invoice_line_items
  WHERE invoice_id = v_invoice_id;
  
  -- Get tax rate from invoice
  SELECT tax_rate INTO v_tax_rate
  FROM customer_invoices
  WHERE id = v_invoice_id;
  
  -- Calculate tax and total
  v_tax_amount := v_subtotal * v_tax_rate;
  v_new_total := v_subtotal + v_tax_amount;
  
  -- Update invoice totals
  UPDATE customer_invoices
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_new_total,
    updated_at = NOW()
  WHERE id = v_invoice_id;
  
  RAISE NOTICE 'Recalculated invoice % totals: subtotal=%, tax=%, total=%', 
    v_invoice_id, v_subtotal, v_tax_amount, v_new_total;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =============================================================================
-- FUNCTION: Update commission from invoice (WITH SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_update_commission_from_invoice()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_commission RECORD;
  v_new_calculated_amount DECIMAL(10,2);
BEGIN
  -- Only process if total amount changed
  IF NEW.total = OLD.total THEN
    RETURN NEW;
  END IF;
  
  -- Find active commissions for this lead
  FOR v_commission IN
    SELECT 
      id, 
      commission_type, 
      commission_rate, 
      flat_amount,
      base_amount,
      calculated_amount,
      paid_amount
    FROM lead_commissions
    WHERE lead_id = NEW.lead_id
    AND status != 'cancelled'
    AND deleted_at IS NULL
  LOOP
    -- Recalculate commission based on new invoice total
    IF v_commission.commission_type = 'percentage' THEN
      v_new_calculated_amount := NEW.total * (v_commission.commission_rate / 100);
    ELSIF v_commission.commission_type = 'flat_amount' THEN
      v_new_calculated_amount := v_commission.flat_amount;
    ELSE
      -- Custom - don't auto-update
      CONTINUE;
    END IF;
    
    -- Update commission with new amounts
    UPDATE lead_commissions
    SET 
      base_amount = NEW.total,
      calculated_amount = v_new_calculated_amount,
      -- If commission was fully paid but now has a balance, mark as pending
      status = CASE
        WHEN paid_amount >= calculated_amount AND paid_amount < v_new_calculated_amount THEN 'pending'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = v_commission.id;
    
    RAISE NOTICE 'Updated commission % for invoice %: base_amount=%, calculated_amount=%', 
      v_commission.id, NEW.id, NEW.total, v_new_calculated_amount;
  END LOOP;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_invoice_from_quote IS 'Automatically create invoice with line items when quote is accepted/approved (bypasses RLS with SECURITY DEFINER)';
COMMENT ON FUNCTION auto_update_invoice_from_change_order IS 'Automatically add change order to invoice when approved (bypasses RLS with SECURITY DEFINER)';
COMMENT ON FUNCTION recalculate_invoice_totals IS 'Automatically recalculate invoice totals when line items are added/updated/deleted (bypasses RLS with SECURITY DEFINER)';
COMMENT ON FUNCTION auto_update_commission_from_invoice IS 'Automatically update commission amounts when invoice total changes (bypasses RLS with SECURITY DEFINER)';
