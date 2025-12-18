-- Multi-User Lead Assignment
-- Rename assigned_to to sales_rep_id and add marketing_rep_id, sales_manager_id, production_manager_id

-- Step 1: Rename assigned_to column to sales_rep_id
ALTER TABLE public.leads 
  RENAME COLUMN assigned_to TO sales_rep_id;

-- Step 2: Add new assignment columns (all optional)
ALTER TABLE public.leads 
  ADD COLUMN marketing_rep_id UUID REFERENCES public.users(id),
  ADD COLUMN sales_manager_id UUID REFERENCES public.users(id),
  ADD COLUMN production_manager_id UUID REFERENCES public.users(id);

-- Step 3: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_sales_rep_id ON public.leads(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_rep_id ON public.leads(marketing_rep_id);
CREATE INDEX IF NOT EXISTS idx_leads_sales_manager_id ON public.leads(sales_manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_production_manager_id ON public.leads(production_manager_id);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.leads.sales_rep_id IS 'Primary sales representative assigned to this lead';
COMMENT ON COLUMN public.leads.marketing_rep_id IS 'Marketing representative assigned to this lead (optional)';
COMMENT ON COLUMN public.leads.sales_manager_id IS 'Sales manager overseeing this lead (optional)';
COMMENT ON COLUMN public.leads.production_manager_id IS 'Production manager for this lead (optional)';

-- Note: Users can be assigned to multiple roles on the same lead
-- Note: All assignment fields are optional - leads can exist without any assignments
-- Note: Commission calculations will use each user's commission plan rate independently
