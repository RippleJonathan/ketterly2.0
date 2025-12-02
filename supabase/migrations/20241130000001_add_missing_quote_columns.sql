-- =====================================================
-- Migration: Add Missing Quote Columns (Safe)
-- Date: 2024-11-30
-- Description: Adds only missing columns to existing quotes table
-- =====================================================

-- Add missing columns to quotes table (IF NOT EXISTS is safe)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS option_label TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days');

-- Add core pricing columns if missing
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.0825;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add missing columns to quote_line_items if needed
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2);
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS line_total DECIMAL(10,2);
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10,2);
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Drop the RLS policy that depends on company_id
DROP POLICY IF EXISTS "Users can access their company's quote line items" ON public.quote_line_items;
DROP POLICY IF EXISTS "Users can access line items for their company's quotes" ON public.quote_line_items;

-- Remove company_id from quote_line_items if it exists (it shouldn't be there)
ALTER TABLE public.quote_line_items DROP COLUMN IF EXISTS company_id;

-- Remove 'name' column if it exists (we use 'description' instead)
ALTER TABLE public.quote_line_items DROP COLUMN IF EXISTS name;

-- Remove 'total' column if it exists (we use 'line_total' instead)
ALTER TABLE public.quote_line_items DROP COLUMN IF EXISTS total;

-- Remove any other wrong column names
ALTER TABLE public.quote_line_items DROP COLUMN IF EXISTS price;
ALTER TABLE public.quote_line_items DROP COLUMN IF EXISTS amount;

-- Create proper RLS policy that checks company_id through the quotes relationship
DROP POLICY IF EXISTS "Users can access line items for their company's quotes" ON public.quote_line_items;
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

-- Add constraints if they don't exist (safe)
DO $$ 
BEGIN
  -- Add category check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_line_items_category_check'
  ) THEN
    ALTER TABLE public.quote_line_items 
    ADD CONSTRAINT quote_line_items_category_check 
    CHECK (category IN ('Labor', 'Materials', 'Permits', 'Equipment', 'Other'));
  END IF;
  
  -- Add quantity check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_line_items_quantity_check'
  ) THEN
    ALTER TABLE public.quote_line_items 
    ADD CONSTRAINT quote_line_items_quantity_check 
    CHECK (quantity > 0);
  END IF;
  
  -- Add unit_price check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_line_items_unit_price_check'
  ) THEN
    ALTER TABLE public.quote_line_items 
    ADD CONSTRAINT quote_line_items_unit_price_check 
    CHECK (unit_price >= 0);
  END IF;
END $$;

-- Add missing columns to leads table for project tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_number TEXT;
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

-- Add unique constraint to project_number if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leads_project_number_key'
  ) THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_project_number_key UNIQUE (project_number);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_leads_project_number ON public.leads(project_number) WHERE project_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_project_manager ON public.leads(project_manager_id) WHERE project_manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_crew_lead ON public.leads(crew_lead_id) WHERE crew_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_scheduled_start ON public.leads(scheduled_start_date) WHERE scheduled_start_date IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.leads.project_number IS 'Auto-generated when quote accepted (e.g., P-2024-001). Null for leads that have not become projects.';

-- Create or replace functions (these are safe to re-run)
CREATE OR REPLACE FUNCTION public.generate_quote_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  quote_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'Q-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.quotes
  WHERE company_id = p_company_id
    AND quote_number LIKE 'Q-' || TO_CHAR(NOW(), 'YYYY') || '-%';
  
  quote_num := 'Q-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.populate_project_fields_from_quote()
RETURNS TRIGGER AS $$
DECLARE
  next_project_num INTEGER;
  new_project_number TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 'P-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO next_project_num
    FROM public.leads
    WHERE company_id = NEW.company_id
      AND project_number IS NOT NULL
      AND project_number LIKE 'P-' || TO_CHAR(NOW(), 'YYYY') || '-%';
    
    new_project_number := 'P-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_project_num::TEXT, 3, '0');
    
    UPDATE public.leads 
    SET 
      status = 'won',
      project_number = new_project_number,
      quoted_amount = NEW.total_amount,
      scope_of_work = NEW.notes,
      updated_at = NOW()
    WHERE id = NEW.lead_id;
    
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

CREATE OR REPLACE FUNCTION public.update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  new_subtotal DECIMAL(10,2);
  new_tax DECIMAL(10,2);
  new_total DECIMAL(10,2);
  quote_tax_rate DECIMAL(5,4);
  quote_discount DECIMAL(10,2);
BEGIN
  SELECT tax_rate, discount_amount INTO quote_tax_rate, quote_discount
  FROM public.quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  SELECT COALESCE(SUM(line_total), 0)
  INTO new_subtotal
  FROM public.quote_line_items
  WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  new_tax := (new_subtotal - COALESCE(quote_discount, 0)) * quote_tax_rate;
  new_total := new_subtotal - COALESCE(quote_discount, 0) + new_tax;
  
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (DROP IF EXISTS is safe)
DROP TRIGGER IF EXISTS on_quote_accepted ON public.quotes;
CREATE TRIGGER on_quote_accepted
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_project_fields_from_quote();

DROP TRIGGER IF EXISTS on_quote_line_item_change ON public.quote_line_items;
CREATE TRIGGER on_quote_line_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_totals();

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

-- Verify the columns now exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quotes' 
      AND column_name = 'option_label'
  ) THEN
    RAISE EXCEPTION 'option_label column was not added to quotes table';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added missing columns to quotes, quote_line_items, and leads tables';
  RAISE NOTICE 'Updated functions and triggers';
END $$;
