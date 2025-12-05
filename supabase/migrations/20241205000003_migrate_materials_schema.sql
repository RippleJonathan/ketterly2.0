-- Migration: Transform existing materials table to new schema
-- This preserves existing data while updating structure
-- Created: 2024-12-05

-- =====================================================
-- STEP 1: Backup existing materials data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.materials_backup AS 
SELECT * FROM public.materials;

-- =====================================================
-- STEP 2: Drop old materials table
-- =====================================================
DROP TABLE IF EXISTS public.materials CASCADE;

-- =====================================================
-- STEP 3: Create new materials table with correct schema
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

-- =====================================================
-- STEP 4: Migrate existing data to new schema
-- =====================================================
INSERT INTO public.materials (
  id,
  company_id,
  name,
  category,
  manufacturer,
  sku,
  unit,
  current_cost,
  is_active,
  notes,
  created_at,
  updated_at,
  deleted_at
)
SELECT 
  id,
  company_id,
  name,
  -- Map old subcategory to new category
  CASE 
    WHEN subcategory IN ('ice_water', 'synthetic') THEN 'underlayment'
    WHEN subcategory IN ('pipe jack', 'flashing') THEN 'flashing'
    WHEN subcategory = 'vent' THEN 'ventilation'
    WHEN category = 'underlayment' THEN 'underlayment'
    WHEN category = 'accessory' THEN 'other'
    ELSE 'other'
  END as category,
  manufacturer,
  sku,
  -- Map old unit_type to new unit
  CASE 
    WHEN unit_type = 'roll' THEN 'roll'
    WHEN unit_type = 'each' THEN 'each'
    WHEN unit_type = 'linear_foot' THEN 'linear_foot'
    WHEN unit_type = 'bundle' THEN 'bundle'
    WHEN unit_type = 'box' THEN 'box'
    WHEN unit_type = 'square' THEN 'square'
    ELSE 'each'
  END as unit,
  unit_price as current_cost, -- Rename unit_price to current_cost
  is_active,
  description as notes, -- Move description to notes
  created_at,
  updated_at,
  deleted_at
FROM public.materials_backup;

-- =====================================================
-- STEP 5: Create indexes
-- =====================================================
CREATE INDEX idx_materials_company_id ON public.materials(company_id);
CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_materials_supplier ON public.materials(default_supplier_id);
CREATE INDEX idx_materials_active ON public.materials(is_active) WHERE is_active = true;
CREATE INDEX idx_materials_name_search ON public.materials USING gin(to_tsvector('english', name || ' ' || COALESCE(manufacturer, '') || ' ' || COALESCE(product_line, '')));

-- =====================================================
-- STEP 6: Create trigger
-- =====================================================
CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 7: Create template_materials junction table
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

-- Indexes for junction table
CREATE INDEX idx_template_materials_template ON public.template_materials(template_id);
CREATE INDEX idx_template_materials_material ON public.template_materials(material_id);
CREATE INDEX idx_template_materials_sort ON public.template_materials(template_id, sort_order);

-- =====================================================
-- STEP 8: Update material_templates table
-- =====================================================
ALTER TABLE public.material_templates 
  ALTER COLUMN items DROP NOT NULL;

COMMENT ON COLUMN public.material_templates.items IS 'Legacy: JSONB array of embedded items. New templates should use template_materials junction table instead.';

-- =====================================================
-- STEP 9: Row Level Security Policies
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
-- STEP 10: Cleanup
-- =====================================================
-- Keep backup table in case you need to rollback
-- To remove backup after verification: DROP TABLE public.materials_backup;

-- Verify migration
SELECT 
  'Migration complete!' as status,
  (SELECT COUNT(*) FROM public.materials_backup) as old_count,
  (SELECT COUNT(*) FROM public.materials) as new_count,
  (SELECT COUNT(*) FROM public.materials_backup) = (SELECT COUNT(*) FROM public.materials) as data_preserved;
