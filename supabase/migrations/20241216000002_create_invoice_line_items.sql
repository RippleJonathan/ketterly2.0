-- =====================================================================
-- Create Invoice Line Items Table for New Invoice System
-- Supports: Contract base + Change Orders + Additional Items
-- =====================================================================

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.customer_invoices(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Line item details
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ea',
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL, -- quantity * unit_price
  
  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN ('contract', 'change_order', 'additional')),
  source_id UUID, -- ID of contract_line_item or change_order_line_item (null if additional)
  
  -- Optional categorization
  category TEXT,
  notes TEXT,
  
  -- Sorting
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add new columns if table already exists (migration update)
DO $$ 
BEGIN
  -- Add unit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_line_items' 
    AND column_name = 'unit'
  ) THEN
    ALTER TABLE public.invoice_line_items ADD COLUMN unit TEXT DEFAULT 'ea';
  END IF;

  -- Add source_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_line_items' 
    AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.invoice_line_items 
    ADD COLUMN source_type TEXT DEFAULT 'additional' NOT NULL;
    
    -- Add check constraint
    ALTER TABLE public.invoice_line_items 
    ADD CONSTRAINT invoice_line_items_source_type_check 
    CHECK (source_type IN ('contract', 'change_order', 'additional'));
  END IF;

  -- Add source_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_line_items' 
    AND column_name = 'source_id'
  ) THEN
    ALTER TABLE public.invoice_line_items ADD COLUMN source_id UUID;
  END IF;

  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_line_items' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.invoice_line_items ADD COLUMN category TEXT;
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_line_items' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.invoice_line_items ADD COLUMN notes TEXT;
  END IF;

  -- Add deleted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_line_items' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.invoice_line_items ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_company_id ON public.invoice_line_items(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_source_type ON public.invoice_line_items(source_type);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_deleted_at ON public.invoice_line_items(deleted_at);

-- RLS
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company's invoice line items" ON public.invoice_line_items;
CREATE POLICY "Users can view their company's invoice line items"
  ON public.invoice_line_items
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create invoice line items for their company" ON public.invoice_line_items;
CREATE POLICY "Users can create invoice line items for their company"
  ON public.invoice_line_items
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their company's invoice line items" ON public.invoice_line_items;
CREATE POLICY "Users can update their company's invoice line items"
  ON public.invoice_line_items
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their company's invoice line items" ON public.invoice_line_items;
CREATE POLICY "Users can delete their company's invoice line items"
  ON public.invoice_line_items
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_invoice_line_items_updated_at ON public.invoice_line_items;
CREATE TRIGGER update_invoice_line_items_updated_at
  BEFORE UPDATE ON public.invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate invoice totals from line items
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal DECIMAL(10,2);
  v_tax_rate DECIMAL(5,4);
  v_tax_amount DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Get the invoice's tax rate
  SELECT tax_rate INTO v_tax_rate
  FROM customer_invoices
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Calculate subtotal from all line items
  SELECT COALESCE(SUM(total), 0) INTO v_subtotal
  FROM invoice_line_items
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND deleted_at IS NULL;
  
  -- Calculate tax
  v_tax_amount := v_subtotal * COALESCE(v_tax_rate, 0);
  v_total := v_subtotal + v_tax_amount;
  
  -- Update the invoice
  UPDATE customer_invoices
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to auto-update invoice totals when line items change
DROP TRIGGER IF EXISTS update_invoice_totals_on_insert ON public.invoice_line_items;
CREATE TRIGGER update_invoice_totals_on_insert
  AFTER INSERT ON public.invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

DROP TRIGGER IF EXISTS update_invoice_totals_on_update ON public.invoice_line_items;
CREATE TRIGGER update_invoice_totals_on_update
  AFTER UPDATE ON public.invoice_line_items
  FOR EACH ROW
  WHEN (
    OLD.quantity IS DISTINCT FROM NEW.quantity OR
    OLD.unit_price IS DISTINCT FROM NEW.unit_price OR
    OLD.total IS DISTINCT FROM NEW.total OR
    OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
  )
  EXECUTE FUNCTION calculate_invoice_totals();

DROP TRIGGER IF EXISTS update_invoice_totals_on_delete ON public.invoice_line_items;
CREATE TRIGGER update_invoice_totals_on_delete
  AFTER DELETE ON public.invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_next_num INTEGER;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the highest invoice number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ ('^INV-' || v_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(invoice_number FROM LENGTH('INV-' || v_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_next_num
  FROM customer_invoices
  WHERE company_id = p_company_id;
  
  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.invoice_line_items IS 'Line items for invoices - supports contract base, change orders, and additional items';
COMMENT ON COLUMN public.invoice_line_items.source_type IS 'Where this line item came from: contract (original), change_order (approved CO), or additional (added during invoicing)';
COMMENT ON COLUMN public.invoice_line_items.source_id IS 'ID of original contract_line_item or change_order_line_item (null for additional items)';
COMMENT ON FUNCTION calculate_invoice_totals IS 'Auto-calculates invoice totals from line items (subtotal, tax, total)';
COMMENT ON FUNCTION generate_invoice_number IS 'Generates sequential invoice numbers per company per year (INV-2024-0001)';
