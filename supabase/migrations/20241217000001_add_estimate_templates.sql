-- Migration: Add Estimate Template System
-- Creates estimate templates similar to material templates
-- Templates can be used to quickly populate estimates with pre-configured line items
-- Created: 2024-12-17

-- =====================================================
-- ESTIMATE_TEMPLATES TABLE
-- =====================================================
CREATE TABLE public.estimate_templates (
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
  CONSTRAINT estimate_templates_name_check CHECK (char_length(name) >= 2),
  CONSTRAINT estimate_templates_category_check CHECK (category IN ('roofing', 'siding', 'windows', 'gutters', 'repairs', 'other'))
);

-- Indexes
CREATE INDEX idx_estimate_templates_company_id ON public.estimate_templates(company_id);
CREATE INDEX idx_estimate_templates_category ON public.estimate_templates(category);
CREATE INDEX idx_estimate_templates_active ON public.estimate_templates(deleted_at) WHERE deleted_at IS NULL;

-- Trigger: Updated timestamp
CREATE TRIGGER estimate_templates_updated_at
  BEFORE UPDATE ON public.estimate_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TEMPLATE_ESTIMATE_ITEMS JUNCTION TABLE
-- =====================================================
-- Links estimate templates to materials from the materials catalog
CREATE TABLE public.template_estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.estimate_templates(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  
  -- Quantity calculation settings
  per_square NUMERIC(10,2) NOT NULL, -- Quantity per square for this template
  description TEXT, -- Template-specific description for this line item
  
  -- Ordering
  sort_order INTEGER DEFAULT 0 NOT NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT template_estimate_items_unique UNIQUE (template_id, material_id),
  CONSTRAINT template_estimate_items_per_square_positive CHECK (per_square > 0)
);

-- Indexes
CREATE INDEX idx_template_estimate_items_template ON public.template_estimate_items(template_id);
CREATE INDEX idx_template_estimate_items_material ON public.template_estimate_items(material_id);
CREATE INDEX idx_template_estimate_items_sort ON public.template_estimate_items(template_id, sort_order);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Estimate Templates table
ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's estimate templates"
  ON public.estimate_templates
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create estimate templates for their company"
  ON public.estimate_templates
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's estimate templates"
  ON public.estimate_templates
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's estimate templates"
  ON public.estimate_templates
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Template Estimate Items table
ALTER TABLE public.template_estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view estimate items for their company's templates"
  ON public.template_estimate_items
  FOR SELECT
  USING (
    template_id IN (
      SELECT id 
      FROM public.estimate_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create estimate items for their company's templates"
  ON public.template_estimate_items
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id 
      FROM public.estimate_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update estimate items for their company's templates"
  ON public.template_estimate_items
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id 
      FROM public.estimate_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete estimate items for their company's templates"
  ON public.template_estimate_items
  FOR DELETE
  USING (
    template_id IN (
      SELECT id 
      FROM public.estimate_templates 
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- HELPER VIEW FOR CALCULATIONS
-- =====================================================
-- View showing what materials are in each template with pricing
CREATE OR REPLACE VIEW estimate_template_calculations AS
SELECT 
  te.id as template_id,
  te.name as template_name,
  te.category,
  te.company_id,
  tei.id as item_id,
  tei.per_square,
  tei.description as item_description,
  tei.sort_order,
  m.id as material_id,
  m.name as material_name,
  m.unit,
  m.current_cost,
  m.measurement_type,
  m.default_per_square
FROM public.estimate_templates te
JOIN public.template_estimate_items tei ON tei.template_id = te.id
JOIN public.materials m ON m.id = tei.material_id
WHERE te.deleted_at IS NULL
  AND m.is_active = true
ORDER BY te.name, tei.sort_order;

COMMENT ON VIEW estimate_template_calculations IS 'Helper view showing materials in each estimate template with pricing and measurement data';

-- Grant access to view
GRANT SELECT ON estimate_template_calculations TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.estimate_templates IS 'Template library for quickly populating estimates with common line item configurations';
COMMENT ON TABLE public.template_estimate_items IS 'Junction table linking estimate templates to materials with per-square quantities';
COMMENT ON COLUMN public.template_estimate_items.per_square IS 'Quantity of this material needed per square (can override material default)';
COMMENT ON COLUMN public.template_estimate_items.description IS 'Optional description override for this line item in the estimate';
