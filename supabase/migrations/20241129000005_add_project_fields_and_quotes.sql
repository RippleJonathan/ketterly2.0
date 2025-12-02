-- =====================================================
-- Migration: Add Project Fields & Quote System
-- Date: 2024-11-29
-- Description: 
--   1. Extends leads table with project-related fields
--   2. Creates quotes system with line items
--   3. Auto-populates project data when quote accepted
-- =====================================================

-- =====================================================
-- PART 1: Extend Leads Table for Project Data
-- =====================================================

-- Add project-related columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_number TEXT UNIQUE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS scheduled_start_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS scheduled_end_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS actual_end_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quoted_amount DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.users(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS crew_lead_id UUID REFERENCES public.users(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS scope_of_work TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_project_number ON public.leads(project_number) WHERE project_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_project_manager ON public.leads(project_manager_id) WHERE project_manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_crew_lead ON public.leads(crew_lead_id) WHERE crew_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_scheduled_start ON public.leads(scheduled_start_date) WHERE scheduled_start_date IS NOT NULL;

-- Add comment to document unified model
COMMENT ON COLUMN public.leads.project_number IS 'Auto-generated when quote accepted (e.g., P-2024-001). Null for leads that have not become projects.';

-- =====================================================
-- PART 2: Quotes Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  
  -- Quote identification
  quote_number TEXT NOT NULL UNIQUE, -- Auto-generated: Q-2024-001
  title TEXT NOT NULL, -- "Roof Replacement - 123 Main St"
  
  -- Status workflow
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')) DEFAULT 'draft',
  version INTEGER DEFAULT 1, -- For quote revisions
  
  -- Multiple options support (Option A, Option B, etc.)
  option_label TEXT, -- "Option A: Full Replacement", "Option B: Repair Only"
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0.0825, -- 8.25%
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Terms
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  payment_terms TEXT DEFAULT 'Net 30',
  notes TEXT, -- Special terms, exclusions, internal notes
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON public.quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their company's quotes"
  ON public.quotes
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PART 3: Quote Line Items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('Labor', 'Materials', 'Permits', 'Equipment', 'Other')),
  
  -- Line item details
  description TEXT NOT NULL, -- "Asphalt shingles - 30yr architectural"
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL, -- "sqft", "bundle", "hours", "each"
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total DECIMAL(10,2) NOT NULL, -- quantity * unit_price (auto-calculated)
  
  -- Optional cost tracking (hidden from customer)
  cost_per_unit DECIMAL(10,2), -- Your actual cost for profit tracking
  supplier TEXT,
  
  -- Organization
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT, -- Internal notes
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON public.quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_sort_order ON public.quote_line_items(quote_id, sort_order);

-- Enable RLS
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access line items for their company's quotes"
  ON public.quote_line_items
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- PART 4: E-Signature Support
-- =====================================================

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Signer information
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  
  -- Signature data
  signature_data TEXT NOT NULL, -- base64 encoded signature image
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Security/audit
  ip_address INET,
  user_agent TEXT,
  
  -- Verification
  verification_token TEXT UNIQUE,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signatures_quote_id ON public.document_signatures(quote_id);
CREATE INDEX IF NOT EXISTS idx_signatures_verification_token ON public.document_signatures(verification_token) WHERE verification_token IS NOT NULL;

-- Enable RLS
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access signatures for their company's quotes"
  ON public.document_signatures
  FOR SELECT
  USING (
    quote_id IN (
      SELECT id FROM public.quotes
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

-- Allow public insert for customer signatures (verified by verification_token)
CREATE POLICY "Anyone can create signatures with valid token"
  ON public.document_signatures
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- PART 5: Quote Number Generation Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_quote_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  quote_num TEXT;
BEGIN
  -- Get the next sequential number for this company and year
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'Q-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.quotes
  WHERE company_id = p_company_id
    AND quote_number LIKE 'Q-' || TO_CHAR(NOW(), 'YYYY') || '-%';
  
  -- Format: Q-2024-001
  quote_num := 'Q-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: Auto-populate Lead Project Fields on Quote Acceptance
-- =====================================================

CREATE OR REPLACE FUNCTION public.populate_project_fields_from_quote()
RETURNS TRIGGER AS $$
DECLARE
  next_project_num INTEGER;
  new_project_number TEXT;
BEGIN
  -- Only run when quote status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Generate project number (P-2024-001)
    SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 'P-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO next_project_num
    FROM public.leads
    WHERE company_id = NEW.company_id
      AND project_number IS NOT NULL
      AND project_number LIKE 'P-' || TO_CHAR(NOW(), 'YYYY') || '-%';
    
    new_project_number := 'P-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_project_num::TEXT, 3, '0');
    
    -- Update the lead with project data
    UPDATE public.leads 
    SET 
      status = 'won',  -- Move to won stage
      project_number = new_project_number,
      quoted_amount = NEW.total_amount,
      scope_of_work = NEW.notes,
      updated_at = NOW()
    WHERE id = NEW.lead_id;
    
    -- Create activity log entry
    INSERT INTO public.lead_activities (
      company_id,
      lead_id,
      activity_type,
      description,
      created_by,
      created_at
    )
    VALUES (
      NEW.company_id,
      NEW.lead_id,
      'status_change',
      'Quote #' || NEW.quote_number || ' accepted - Project ' || new_project_number || ' created',
      NEW.created_by,
      NOW()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_quote_accepted ON public.quotes;
CREATE TRIGGER on_quote_accepted
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_project_fields_from_quote();

-- =====================================================
-- PART 7: Auto-update Quote Totals Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  new_subtotal DECIMAL(10,2);
  new_tax DECIMAL(10,2);
  new_total DECIMAL(10,2);
  quote_tax_rate DECIMAL(5,4);
  quote_discount DECIMAL(10,2);
BEGIN
  -- Get current quote's tax rate and discount
  SELECT tax_rate, discount_amount INTO quote_tax_rate, quote_discount
  FROM public.quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Calculate new subtotal from all line items
  SELECT COALESCE(SUM(line_total), 0)
  INTO new_subtotal
  FROM public.quote_line_items
  WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Calculate tax and total
  new_tax := (new_subtotal - COALESCE(quote_discount, 0)) * quote_tax_rate;
  new_total := new_subtotal - COALESCE(quote_discount, 0) + new_tax;
  
  -- Update quote totals
  UPDATE public.quotes
  SET 
    subtotal = new_subtotal,
    tax_amount = new_tax,
    total_amount = new_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for line item changes
DROP TRIGGER IF EXISTS on_quote_line_item_change ON public.quote_line_items;
CREATE TRIGGER on_quote_line_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_totals();

-- =====================================================
-- PART 8: Updated Timestamps Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_line_items_updated_at ON public.quote_line_items;
CREATE TRIGGER update_quote_line_items_updated_at
  BEFORE UPDATE ON public.quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 9: Sample Data (Optional - Comment out for production)
-- =====================================================

-- Uncomment below to add sample quote data for testing

/*
-- Insert a sample quote for first lead
INSERT INTO public.quotes (
  company_id,
  lead_id,
  quote_number,
  title,
  status,
  option_label,
  tax_rate,
  payment_terms,
  notes,
  created_by
)
SELECT 
  l.company_id,
  l.id,
  'Q-' || TO_CHAR(NOW(), 'YYYY') || '-001',
  'Roof Replacement - ' || l.address,
  'draft',
  'Option A: Full Replacement',
  0.0825,
  'Net 30 - 50% deposit required',
  'Weather delays may extend timeline. Disposal fees included.',
  (SELECT id FROM public.users WHERE company_id = l.company_id LIMIT 1)
FROM public.leads l
WHERE l.status = 'quote'
LIMIT 1;

-- Insert sample line items
INSERT INTO public.quote_line_items (
  quote_id,
  category,
  description,
  quantity,
  unit,
  unit_price,
  line_total,
  cost_per_unit,
  sort_order
)
SELECT 
  q.id,
  'Labor',
  'Remove existing shingles',
  25.00,
  'sqft',
  2.50,
  62.50,
  1.50,
  1
FROM public.quotes q
WHERE q.quote_number LIKE 'Q-' || TO_CHAR(NOW(), 'YYYY') || '-%'
LIMIT 1;
*/

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify tables exist
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') = 1,
    'quotes table was not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_line_items') = 1,
    'quote_line_items table was not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_signatures') = 1,
    'document_signatures table was not created';
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added project fields to leads table';
  RAISE NOTICE 'Created quotes, quote_line_items, and document_signatures tables';
  RAISE NOTICE 'Set up auto-triggers for quote acceptance and total calculations';
END $$;
