-- =============================================
-- INVOICING & PAYMENTS SYSTEM
-- Migration: Add customer invoices, payments, change orders, and commissions
-- Date: December 10, 2024
-- =============================================

-- =============================================
-- PART 1: CHANGE ORDERS
-- Track additional work beyond the original quote
-- =============================================

CREATE TABLE public.change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  
  -- Change order info
  change_order_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Pricing (what you charge the customer)
  amount DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL, -- amount + tax_amount
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  
  -- Approval tracking
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,
  
  -- Customer signature/acceptance
  customer_signature_url TEXT,
  customer_signed_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_change_orders_company_id ON public.change_orders(company_id);
CREATE INDEX idx_change_orders_lead_id ON public.change_orders(lead_id);
CREATE INDEX idx_change_orders_quote_id ON public.change_orders(quote_id);
CREATE INDEX idx_change_orders_status ON public.change_orders(status);
CREATE INDEX idx_change_orders_deleted_at ON public.change_orders(deleted_at);

-- RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's change orders"
  ON public.change_orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create change orders for their company"
  ON public.change_orders FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's change orders"
  ON public.change_orders FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's change orders"
  ON public.change_orders FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Trigger
CREATE TRIGGER update_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.change_orders IS 'Additional work beyond original quote - tracks scope changes and additional revenue';

-- =============================================
-- PART 2: CUSTOMER INVOICES
-- What you bill the customer (based on quote + change orders)
-- =============================================

CREATE TABLE public.customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  
  -- Invoice info
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Amounts (from quote + approved change orders)
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Payment tracking
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',      -- Being created
    'sent',       -- Sent to customer
    'partial',    -- Partially paid
    'paid',       -- Fully paid
    'overdue',    -- Past due date
    'cancelled',  -- Cancelled
    'void'        -- Voided
  )),
  
  -- Document
  pdf_url TEXT, -- Path in Supabase Storage
  
  -- Email tracking
  sent_to_email TEXT,
  sent_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  
  -- Payment terms
  payment_terms TEXT, -- "Net 30", "Due on receipt", etc.
  late_fee_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  internal_notes TEXT, -- Not shown to customer
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_customer_invoices_company_id ON public.customer_invoices(company_id);
CREATE INDEX idx_customer_invoices_lead_id ON public.customer_invoices(lead_id);
CREATE INDEX idx_customer_invoices_quote_id ON public.customer_invoices(quote_id);
CREATE INDEX idx_customer_invoices_status ON public.customer_invoices(status);
CREATE INDEX idx_customer_invoices_invoice_date ON public.customer_invoices(invoice_date);
CREATE INDEX idx_customer_invoices_due_date ON public.customer_invoices(due_date);
CREATE INDEX idx_customer_invoices_deleted_at ON public.customer_invoices(deleted_at);

-- RLS
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's customer invoices"
  ON public.customer_invoices FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create customer invoices for their company"
  ON public.customer_invoices FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's customer invoices"
  ON public.customer_invoices FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's customer invoices"
  ON public.customer_invoices FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Trigger
CREATE TRIGGER update_customer_invoices_updated_at
  BEFORE UPDATE ON public.customer_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.customer_invoices IS 'Customer invoices - what you bill the customer (based on quote + change orders)';

-- =============================================
-- PART 3: INVOICE LINE ITEMS
-- Breakdown of what's being billed
-- =============================================

CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.customer_invoices(id) ON DELETE CASCADE NOT NULL,
  
  -- Line item details
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Reference to source (quote line item or change order)
  quote_line_item_id UUID REFERENCES public.quote_line_items(id) ON DELETE SET NULL,
  change_order_id UUID REFERENCES public.change_orders(id) ON DELETE SET NULL,
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoice_line_items_company_id ON public.invoice_line_items(company_id);
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_quote_line_item_id ON public.invoice_line_items(quote_line_item_id);
CREATE INDEX idx_invoice_line_items_change_order_id ON public.invoice_line_items(change_order_id);

-- RLS
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's invoice line items"
  ON public.invoice_line_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create invoice line items for their company"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's invoice line items"
  ON public.invoice_line_items FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's invoice line items"
  ON public.invoice_line_items FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.invoice_line_items IS 'Line items for customer invoices';

-- =============================================
-- PART 4: PAYMENTS
-- Track customer payments received
-- =============================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.customer_invoices(id) ON DELETE SET NULL,
  
  -- Payment info
  payment_number TEXT UNIQUE NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  
  -- Payment method
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash',
    'check',
    'credit_card',
    'debit_card',
    'ach',
    'wire_transfer',
    'financing',
    'other'
  )),
  
  -- Payment details
  reference_number TEXT, -- Check number, transaction ID, etc.
  card_last_four TEXT,
  card_brand TEXT, -- Visa, Mastercard, etc.
  
  -- Deposit tracking
  deposited BOOLEAN DEFAULT false,
  deposit_date DATE,
  deposit_reference TEXT,
  
  -- Receipt
  receipt_url TEXT, -- Path to receipt PDF in storage
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_payments_company_id ON public.payments(company_id);
CREATE INDEX idx_payments_lead_id ON public.payments(lead_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX idx_payments_deleted_at ON public.payments(deleted_at);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's payments"
  ON public.payments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create payments for their company"
  ON public.payments FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's payments"
  ON public.payments FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's payments"
  ON public.payments FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.payments IS 'Customer payments received';

-- =============================================
-- PART 5: COMMISSIONS
-- Track sales commissions
-- =============================================

CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL, -- Sales rep
  
  -- Commission details
  commission_type TEXT NOT NULL CHECK (commission_type IN (
    'sale',      -- Standard sales commission
    'bonus',     -- Performance bonus
    'override',  -- Manager override
    'referral'   -- Referral commission
  )),
  
  -- Calculation
  base_amount DECIMAL(10,2) NOT NULL, -- Amount commission is calculated on (usually quote total)
  percentage DECIMAL(5,2), -- e.g., 5.00 for 5%
  flat_amount DECIMAL(10,2), -- Or flat dollar amount
  commission_amount DECIMAL(10,2) NOT NULL, -- Final commission owed
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',   -- Not yet approved
    'approved',  -- Approved but not paid
    'paid',      -- Commission paid out
    'cancelled'  -- Cancelled (job cancelled, etc.)
  )),
  
  -- Payment tracking
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  paid_date DATE,
  payment_reference TEXT,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_commissions_company_id ON public.commissions(company_id);
CREATE INDEX idx_commissions_lead_id ON public.commissions(lead_id);
CREATE INDEX idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_deleted_at ON public.commissions(deleted_at);

-- RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's commissions"
  ON public.commissions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create commissions for their company"
  ON public.commissions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's commissions"
  ON public.commissions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's commissions"
  ON public.commissions FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Trigger
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.commissions IS 'Sales commissions and bonuses';

-- =============================================
-- PART 6: ADD OVERHEAD TRACKING TO COMPANIES
-- =============================================

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_overhead_percentage DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS default_commission_percentage DECIMAL(5,2) DEFAULT 5.00;

COMMENT ON COLUMN public.companies.default_overhead_percentage IS 'Default overhead % to apply to jobs (e.g., 10.00 for 10%)';
COMMENT ON COLUMN public.companies.default_commission_percentage IS 'Default sales commission % for reps (e.g., 5.00 for 5%)';

-- =============================================
-- PART 7: ADD JOB OVERHEAD TRACKING TO LEADS
-- =============================================

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS overhead_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS overhead_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS custom_overhead BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.leads.overhead_percentage IS 'Overhead % for this specific job (overrides company default if custom_overhead=true)';
COMMENT ON COLUMN public.leads.overhead_amount IS 'Calculated overhead dollar amount';
COMMENT ON COLUMN public.leads.custom_overhead IS 'If true, use lead-specific overhead instead of company default';

-- =============================================
-- PART 8: HELPER FUNCTIONS
-- =============================================

-- Function to auto-update invoice amount_paid when payments are added
CREATE OR REPLACE FUNCTION update_invoice_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the invoice's amount_paid based on all payments
  UPDATE public.customer_invoices
  SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.payments
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      AND deleted_at IS NULL
  )
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice when payment is added/updated/deleted
CREATE TRIGGER update_invoice_on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_amount_paid();

-- Function to auto-update invoice status based on amount_paid
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_paid >= NEW.total THEN
    NEW.status = 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled', 'void') THEN
    NEW.status = 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice status
CREATE TRIGGER auto_update_invoice_status
  BEFORE UPDATE ON public.customer_invoices
  FOR EACH ROW
  WHEN (OLD.amount_paid IS DISTINCT FROM NEW.amount_paid OR OLD.total IS DISTINCT FROM NEW.total)
  EXECUTE FUNCTION update_invoice_status();

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify all tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'change_orders',
    'customer_invoices',
    'invoice_line_items',
    'payments',
    'commissions'
  )
ORDER BY tablename;

-- Verify all indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'change_orders',
    'customer_invoices',
    'invoice_line_items',
    'payments',
    'commissions'
  )
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'change_orders',
    'customer_invoices',
    'invoice_line_items',
    'payments',
    'commissions'
  )
ORDER BY tablename, policyname;
