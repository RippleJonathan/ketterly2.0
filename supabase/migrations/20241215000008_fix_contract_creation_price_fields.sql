-- =====================================================================
-- FIX: Add original_contract_price and current_contract_price to contract creation
-- The migration 20241215000002 added these NOT NULL columns but the 
-- create_contract_from_quote function doesn't populate them
-- =====================================================================

CREATE OR REPLACE FUNCTION create_contract_from_quote(
  p_quote_id UUID,
  p_customer_signature_date TIMESTAMPTZ DEFAULT NULL,
  p_customer_signature_data TEXT DEFAULT NULL,
  p_customer_signed_by TEXT DEFAULT NULL,
  p_customer_ip_address INET DEFAULT NULL,
  p_company_signature_date TIMESTAMPTZ DEFAULT NULL,
  p_company_signature_data TEXT DEFAULT NULL,
  p_company_signed_by TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_contract_id UUID;
  v_quote RECORD;
  v_contract_number TEXT;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM public.quotes
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;
  
  -- Generate contract number
  v_contract_number := generate_contract_number(v_quote.company_id);
  
  -- Create signed contract
  INSERT INTO public.signed_contracts (
    company_id,
    lead_id,
    quote_id,
    contract_number,
    contract_date,
    quote_snapshot,
    original_subtotal,
    original_tax,
    original_discount,
    original_total,
    original_contract_price,        -- ADDED: Initial contract amount
    current_contract_price,          -- ADDED: Current total (starts same as original)
    customer_signature_date,
    customer_signature_data,
    customer_signed_by,
    customer_ip_address,
    company_signature_date,
    company_signature_data,
    company_signed_by,
    payment_terms,
    notes,
    status
  )
  VALUES (
    v_quote.company_id,
    v_quote.lead_id,
    p_quote_id,
    v_contract_number,
    NOW(),
    row_to_json(v_quote)::JSONB,
    v_quote.subtotal,
    v_quote.tax_amount,
    v_quote.discount_amount,
    v_quote.total_amount,
    v_quote.total_amount,            -- ADDED: Set to quote total
    v_quote.total_amount,            -- ADDED: Set to quote total (will update with change orders)
    p_customer_signature_date,
    p_customer_signature_data,
    p_customer_signed_by,
    p_customer_ip_address::TEXT,
    p_company_signature_date,
    p_company_signature_data,
    p_company_signed_by,
    v_quote.payment_terms,
    v_quote.notes,
    'active'
  )
  RETURNING id INTO v_contract_id;
  
  -- Copy line items
  INSERT INTO public.contract_line_items (
    contract_id,
    category,
    description,
    quantity,
    unit,
    unit_price,
    line_total,
    cost_per_unit,
    supplier,
    sort_order
  )
  SELECT
    v_contract_id,
    category,
    description,
    quantity,
    unit,
    unit_price,
    line_total,
    cost_per_unit,
    supplier,
    sort_order
  FROM public.quote_line_items
  WHERE quote_id = p_quote_id
  ORDER BY sort_order;
  
  RETURN v_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Update comment
COMMENT ON FUNCTION create_contract_from_quote IS 'Creates a signed contract snapshot from a quote with original and current contract prices. Current price updates with approved change orders.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed: create_contract_from_quote now sets original_contract_price and current_contract_price';
  RAISE NOTICE '   Both fields are set to quote.total_amount initially';
  RAISE NOTICE '   current_contract_price will be updated by change order approvals';
END $$;
