-- =====================================================================
-- Add Change Order Line Items Table
-- Makes change orders standalone documents (not tied to estimate changes)
-- =====================================================================

-- Create change_order_line_items table
CREATE TABLE IF NOT EXISTS public.change_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID REFERENCES public.change_orders(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Line item details (same structure as quote_line_items)
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL, -- quantity * unit_price
  
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

-- Indexes
CREATE INDEX idx_change_order_line_items_change_order_id ON public.change_order_line_items(change_order_id);
CREATE INDEX idx_change_order_line_items_company_id ON public.change_order_line_items(company_id);
CREATE INDEX idx_change_order_line_items_deleted_at ON public.change_order_line_items(deleted_at);

-- RLS
ALTER TABLE public.change_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's change order line items"
  ON public.change_order_line_items
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create change order line items for their company"
  ON public.change_order_line_items
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's change order line items"
  ON public.change_order_line_items
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

CREATE POLICY "Users can delete their company's change order line items"
  ON public.change_order_line_items
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_change_order_line_items_updated_at
  BEFORE UPDATE ON public.change_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate change order totals from line items
CREATE OR REPLACE FUNCTION calculate_change_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal DECIMAL(10,2);
  v_tax_rate DECIMAL(5,4);
  v_tax_amount DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Get the change order's tax rate
  SELECT tax_rate INTO v_tax_rate
  FROM change_orders
  WHERE id = NEW.change_order_id;
  
  -- Calculate subtotal from all line items
  SELECT COALESCE(SUM(total), 0) INTO v_subtotal
  FROM change_order_line_items
  WHERE change_order_id = NEW.change_order_id
    AND deleted_at IS NULL;
  
  -- Calculate tax
  v_tax_amount := v_subtotal * v_tax_rate;
  v_total := v_subtotal + v_tax_amount;
  
  -- Update the change order
  UPDATE change_orders
  SET 
    amount = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    updated_at = NOW()
  WHERE id = NEW.change_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update change order totals when line items change
CREATE TRIGGER update_change_order_totals_on_insert
  AFTER INSERT ON public.change_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_change_order_totals();

CREATE TRIGGER update_change_order_totals_on_update
  AFTER UPDATE ON public.change_order_line_items
  FOR EACH ROW
  WHEN (
    OLD.quantity IS DISTINCT FROM NEW.quantity OR
    OLD.unit_price IS DISTINCT FROM NEW.unit_price OR
    OLD.total IS DISTINCT FROM NEW.total OR
    OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
  )
  EXECUTE FUNCTION calculate_change_order_totals();

CREATE TRIGGER update_change_order_totals_on_delete
  AFTER DELETE ON public.change_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_change_order_totals();

-- Update change_orders table to add signature fields we're now using
ALTER TABLE public.change_orders
ADD COLUMN IF NOT EXISTS customer_signature_data TEXT,
ADD COLUMN IF NOT EXISTS customer_signer_name TEXT,
ADD COLUMN IF NOT EXISTS company_signature_data TEXT,
ADD COLUMN IF NOT EXISTS company_signature_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS company_signer_name TEXT,
ADD COLUMN IF NOT EXISTS company_signer_title TEXT,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Update status check constraint to include new statuses
ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_status_check;
ALTER TABLE public.change_orders
ADD CONSTRAINT change_orders_status_check 
CHECK (status IN ('draft', 'pending', 'sent', 'pending_customer_signature', 'pending_company_signature', 'approved', 'declined', 'cancelled'));

COMMENT ON TABLE public.change_order_line_items IS 'Line items for change orders - allows building change orders as standalone documents';
COMMENT ON COLUMN public.change_orders.amount IS 'Subtotal of all line items (before tax)';
COMMENT ON COLUMN public.change_orders.tax_amount IS 'Calculated tax amount (amount * tax_rate)';
COMMENT ON COLUMN public.change_orders.total IS 'Total including tax (amount + tax_amount)';
