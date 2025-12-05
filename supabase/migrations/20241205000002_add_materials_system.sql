-- Migration: Add Material Master System
-- Replaces embedded template items with reusable material catalog
-- Created: 2024-12-05

-- =====================================================
-- MATERIALS TABLE (Master Catalog)
-- =====================================================
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Material identification
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'shingles', 'underlayment', 'ventilation', 'flashing', 'fasteners', 'other'
  manufacturer TEXT,
  product_line TEXT, -- e.g., 'ClimateFlex', 'Duration', 'Timberline'
  sku TEXT,
  
  -- Pricing & units
  unit TEXT NOT NULL, -- 'bundle', 'roll', 'box', 'square', 'linear_foot', 'each'
  current_cost NUMERIC(10,2), -- Current cost per unit
  last_price_update TIMESTAMPTZ,
  
  -- Supplier
  default_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  
  -- Default conversion rate
  default_per_square NUMERIC(10,2), -- Typical quantity per square (can be overridden in templates)
  
  -- Status & metadata
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT materials_name_check CHECK (char_length(name) >= 2),
  CONSTRAINT materials_category_check CHECK (category IN ('shingles', 'underlayment', 'ventilation', 'flashing', 'fasteners', 'siding', 'windows', 'gutters', 'other')),
  CONSTRAINT materials_unit_check CHECK (unit IN ('bundle', 'roll', 'box', 'square', 'linear_foot', 'each', 'sheet', 'bag'))
);

-- Indexes
CREATE INDEX idx_materials_company_id ON public.materials(company_id);
CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_materials_supplier ON public.materials(default_supplier_id);
CREATE INDEX idx_materials_active ON public.materials(is_active) WHERE is_active = true;
CREATE INDEX idx_materials_name_search ON public.materials USING gin(to_tsvector('english', name || ' ' || COALESCE(manufacturer, '') || ' ' || COALESCE(product_line, '')));

-- Trigger: Updated timestamp
CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TEMPLATE_MATERIALS JUNCTION TABLE
-- =====================================================
CREATE TABLE public.template_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.material_templates(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  
  -- Override settings (can differ from material defaults)
  per_square NUMERIC(10,2) NOT NULL, -- Quantity per square for this template
  description TEXT, -- Template-specific notes about this material
  
  -- Ordering
  sort_order INTEGER DEFAULT 0 NOT NULL,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT template_materials_unique UNIQUE (template_id, material_id),
  CONSTRAINT template_materials_per_square_positive CHECK (per_square > 0)
);

-- Indexes
CREATE INDEX idx_template_materials_template ON public.template_materials(template_id);
CREATE INDEX idx_template_materials_material ON public.template_materials(material_id);
CREATE INDEX idx_template_materials_sort ON public.template_materials(template_id, sort_order);

-- =====================================================
-- UPDATE MATERIAL_TEMPLATES TABLE
-- =====================================================
-- Make items column nullable (templates can now use junction table instead)
ALTER TABLE public.material_templates 
  ALTER COLUMN items DROP NOT NULL;

-- Add comment explaining dual approach
COMMENT ON COLUMN public.material_templates.items IS 'Legacy: JSONB array of embedded items. New templates should use template_materials junction table instead.';

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Materials table
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company materials"
  ON public.materials
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company materials"
  ON public.materials
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company materials"
  ON public.materials
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company materials"
  ON public.materials
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Template_materials junction table
ALTER TABLE public.template_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company template materials"
  ON public.template_materials
  FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.material_templates 
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their company template materials"
  ON public.template_materials
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.material_templates 
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
    AND
    material_id IN (
      SELECT id FROM public.materials
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their company template materials"
  ON public.template_materials
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM public.material_templates 
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their company template materials"
  ON public.template_materials
  FOR DELETE
  USING (
    template_id IN (
      SELECT id FROM public.material_templates 
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- SAMPLE DATA (commented out - uncomment to test)
-- =====================================================

-- Sample materials for Ripple Roofing
/*
INSERT INTO public.materials (company_id, name, category, manufacturer, product_line, unit, current_cost, default_per_square, is_active) 
VALUES
  -- Shingles
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'CertainTeed ClimateFlex Hip & Ridge', 'shingles', 'CertainTeed', 'ClimateFlex', 'bundle', 85.00, 3.0, true),
  
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'Owens Corning Duration Shingles', 'shingles', 'Owens Corning', 'Duration', 'bundle', 92.00, 3.0, true),
  
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'GAF Timberline HDZ', 'shingles', 'GAF', 'Timberline', 'bundle', 88.00, 3.0, true),
  
  -- Underlayment
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'Grace Ice & Water Shield', 'underlayment', 'Grace', 'Ice & Water', 'roll', 125.00, 0.1, true),
  
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'Synthetic Underlayment', 'underlayment', 'Generic', NULL, 'roll', 45.00, 0.2, true),
  
  -- Ventilation
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'Ridge Vent (10ft)', 'ventilation', 'CertainTeed', 'Ridge Vent', 'each', 45.00, NULL, true),
  
  -- Flashing
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'Aluminum Drip Edge', 'flashing', 'Generic', NULL, 'linear_foot', 2.50, NULL, true),
  
  -- Fasteners
  ((SELECT id FROM public.companies WHERE slug = 'ripple-roofing-&-construction'), 
   'Roofing Nails (1-1/4")', 'fasteners', 'Generic', NULL, 'box', 35.00, 0.5, true);
*/
