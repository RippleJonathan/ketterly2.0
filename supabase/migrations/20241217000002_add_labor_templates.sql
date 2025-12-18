-- Migration: Add Labor Order Template System
-- Creates labor templates similar to material and estimate templates
-- Templates can be used to quickly populate labor orders with pre-configured line items
-- Created: 2024-12-17

-- =====================================================
-- LABOR_TEMPLATES TABLE
-- =====================================================
CREATE TABLE public.labor_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Template identification
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'roofing', 'siding', 'windows', 'gutters', 'other'
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT labor_templates_name_check CHECK (char_length(name) >= 2),
  CONSTRAINT labor_templates_category_check CHECK (category IN ('roofing', 'siding', 'windows', 'gutters', 'repairs', 'other'))
);

-- Indexes
CREATE INDEX idx_labor_templates_company_id ON public.labor_templates(company_id);
CREATE INDEX idx_labor_templates_category ON public.labor_templates(category);
CREATE INDEX idx_labor_templates_active ON public.labor_templates(deleted_at) WHERE deleted_at IS NULL;

-- Trigger: Updated timestamp
CREATE TRIGGER labor_templates_updated_at
  BEFORE UPDATE ON public.labor_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TEMPLATE_LABOR_ITEMS TABLE
-- =====================================================
-- Stores individual labor line items within a template
CREATE TABLE public.template_labor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.labor_templates(id) ON DELETE CASCADE NOT NULL,
  
  -- Labor item details
  description TEXT NOT NULL,
  hours NUMERIC(10,2) NOT NULL, -- Estimated hours for this task
  hourly_rate NUMERIC(10,2), -- Optional default rate (can be overridden)
  notes TEXT, -- Additional instructions or notes
  
  -- Ordering
  sort_order INTEGER DEFAULT 0 NOT NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT template_labor_items_hours_positive CHECK (hours > 0),
  CONSTRAINT template_labor_items_rate_positive CHECK (hourly_rate IS NULL OR hourly_rate > 0)
);

-- Indexes
CREATE INDEX idx_template_labor_items_template ON public.template_labor_items(template_id);
CREATE INDEX idx_template_labor_items_sort ON public.template_labor_items(template_id, sort_order);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Labor Templates table
ALTER TABLE public.labor_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's labor templates"
  ON public.labor_templates
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create labor templates for their company"
  ON public.labor_templates
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's labor templates"
  ON public.labor_templates
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's labor templates"
  ON public.labor_templates
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Template Labor Items table
ALTER TABLE public.template_labor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labor items for their company's templates"
  ON public.template_labor_items
  FOR SELECT
  USING (
    template_id IN (
      SELECT id 
      FROM public.labor_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create labor items for their company's templates"
  ON public.template_labor_items
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id 
      FROM public.labor_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update labor items for their company's templates"
  ON public.template_labor_items
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id 
      FROM public.labor_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete labor items for their company's templates"
  ON public.template_labor_items
  FOR DELETE
  USING (
    template_id IN (
      SELECT id 
      FROM public.labor_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.labor_templates IS 'Template library for quickly populating labor orders with common task configurations';
COMMENT ON TABLE public.template_labor_items IS 'Individual labor line items within a labor template';
COMMENT ON COLUMN public.template_labor_items.hours IS 'Estimated hours needed to complete this task';
COMMENT ON COLUMN public.template_labor_items.hourly_rate IS 'Optional default hourly rate (can be overridden when importing)';
