-- =====================================================================
-- Create Signed Contracts System
-- Stores point-in-time snapshots when quotes are signed
-- =====================================================================

-- Signed Contracts Table (snapshot of quote at signing)
CREATE TABLE public.signed_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Contract identification
  contract_number TEXT NOT NULL,
  contract_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Snapshot of quote data at time of signing
  quote_snapshot JSONB NOT NULL, -- Full quote details
  
  -- Totals at time of signing
  original_subtotal NUMERIC(10,2) NOT NULL,
  original_tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  original_total NUMERIC(10,2) NOT NULL,
  
  -- Signatures
  customer_signature_date TIMESTAMPTZ,
  customer_signature_data TEXT, -- Base64 signature image
  customer_signed_by TEXT,
  customer_ip_address TEXT,
  
  company_signature_date TIMESTAMPTZ,
  company_signature_data TEXT,
  company_signed_by TEXT,
  
  -- Contract terms
  payment_terms TEXT,
  notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.users(id),
  void_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT signed_contracts_status_check CHECK (status IN ('active', 'voided', 'superseded')),
  CONSTRAINT signed_contracts_contract_number_unique UNIQUE (company_id, contract_number)
);

-- Contract Line Items (snapshot of quote line items)
CREATE TABLE public.contract_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.signed_contracts(id) ON DELETE CASCADE NOT NULL,
  
  -- Line item details (snapshot)
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  
  -- Cost tracking (optional)
  cost_per_unit NUMERIC(10,2),
  supplier TEXT,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT contract_line_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT contract_line_items_unit_price_check CHECK (unit_price >= 0),
  CONSTRAINT contract_line_items_line_total_check CHECK (line_total >= 0)
);

-- Indexes
CREATE INDEX idx_signed_contracts_company ON public.signed_contracts(company_id);
CREATE INDEX idx_signed_contracts_lead ON public.signed_contracts(lead_id);
CREATE INDEX idx_signed_contracts_quote ON public.signed_contracts(quote_id);
CREATE INDEX idx_signed_contracts_status ON public.signed_contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_signed_contracts_date ON public.signed_contracts(contract_date);

CREATE INDEX idx_contract_line_items_contract ON public.contract_line_items(contract_id);
CREATE INDEX idx_contract_line_items_sort ON public.contract_line_items(contract_id, sort_order);

-- Triggers
CREATE TRIGGER signed_contracts_updated_at
  BEFORE UPDATE ON public.signed_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.signed_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's contracts"
  ON public.signed_contracts
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can only access their company's contract line items"
  ON public.contract_line_items
  FOR ALL
  USING (
    contract_id IN (
      SELECT id 
      FROM public.signed_contracts 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_number TEXT;
BEGIN
  -- Get count of contracts for this company
  SELECT COUNT(*) INTO v_count
  FROM public.signed_contracts
  WHERE company_id = p_company_id
    AND deleted_at IS NULL;
  
  -- Generate number: C-YYYYMMDD-NNN
  v_number := 'C-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create contract snapshot from quote
CREATE OR REPLACE FUNCTION create_contract_from_quote(
  p_quote_id UUID,
  p_customer_signature_date TIMESTAMPTZ DEFAULT NULL,
  p_customer_signature_data TEXT DEFAULT NULL,
  p_customer_signed_by TEXT DEFAULT NULL,
  p_customer_ip_address TEXT DEFAULT NULL,
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
    v_quote.quote_id,
    v_contract_number,
    NOW(),
    row_to_json(v_quote)::JSONB,
    v_quote.subtotal,
    v_quote.tax_amount,
    v_quote.discount_amount,
    v_quote.total_amount,
    p_customer_signature_date,
    p_customer_signature_data,
    p_customer_signed_by,
    p_customer_ip_address,
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
    AND deleted_at IS NULL
  ORDER BY sort_order;
  
  RETURN v_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE public.signed_contracts IS 'Point-in-time snapshots of quotes when signed. Original contract remains unchanged even if quote is edited.';
COMMENT ON TABLE public.contract_line_items IS 'Line items from signed contract (snapshot). Compare with current quote_line_items to detect changes.';
COMMENT ON FUNCTION create_contract_from_quote IS 'Creates a signed contract snapshot from a quote. Call this when quote is accepted/signed.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Signed contracts system created. Quotes remain editable after signing.';
  RAISE NOTICE 'Use create_contract_from_quote() to snapshot a quote when signed.';
END $$;
