-- =============================================
-- Materials/Accessories Library
-- =============================================
-- Master database of materials, accessories, and labor items
-- Can be used in measurements, quotes, and work orders
-- =============================================

-- =============================================
-- PART 1: Materials Library Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.materials (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Material details
  name TEXT NOT NULL, -- e.g., "Turtle Vent", "3-in-1 Pipe Jack", "Shingle Bundle"
  category TEXT NOT NULL, -- e.g., "accessory", "shingle", "underlayment", "flashing", "labor"
  subcategory TEXT, -- e.g., "vent", "pipe jack", "ridge cap"
  
  -- Pricing
  unit_price DECIMAL(10,2), -- Price per unit
  unit_type TEXT DEFAULT 'each', -- 'each', 'bundle', 'roll', 'square', 'linear_foot', 'hour'
  
  -- Material specifications
  manufacturer TEXT,
  model_number TEXT,
  color TEXT,
  description TEXT,
  
  -- Stock/inventory (optional - for future use)
  sku TEXT,
  current_stock INTEGER,
  reorder_point INTEGER,
  
  -- Settings
  is_active BOOLEAN DEFAULT true, -- Active items show in search
  is_taxable BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- =============================================
-- PART 2: Measurement Accessories Join Table
-- =============================================
-- Links measurements to materials with quantities

CREATE TABLE IF NOT EXISTS public.measurement_accessories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  measurement_id UUID NOT NULL REFERENCES public.lead_measurements(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  
  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Notes for this specific accessory instance
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes for performance
-- =============================================

-- Materials indexes
CREATE INDEX idx_materials_company_id ON public.materials(company_id);
CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_materials_is_active ON public.materials(is_active);
CREATE INDEX idx_materials_name_search ON public.materials USING gin(to_tsvector('english', name));
CREATE INDEX idx_materials_deleted_at ON public.materials(deleted_at);

-- Measurement accessories indexes
CREATE INDEX idx_measurement_accessories_measurement_id ON public.measurement_accessories(measurement_id);
CREATE INDEX idx_measurement_accessories_material_id ON public.measurement_accessories(material_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Materials table RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their company's materials"
  ON public.materials
  FOR ALL
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

-- Measurement accessories RLS
ALTER TABLE public.measurement_accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their company's measurement accessories"
  ON public.measurement_accessories
  FOR ALL
  USING (
    measurement_id IN (
      SELECT id FROM public.lead_measurements 
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    measurement_id IN (
      SELECT id FROM public.lead_measurements 
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- Triggers
-- =============================================

-- Auto-update updated_at for materials
CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_materials_updated_at();

-- Auto-update updated_at for measurement_accessories
CREATE OR REPLACE FUNCTION update_measurement_accessories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER measurement_accessories_updated_at
  BEFORE UPDATE ON public.measurement_accessories
  FOR EACH ROW
  EXECUTE FUNCTION update_measurement_accessories_updated_at();

-- =============================================
-- Seed Data - Common Roofing Accessories
-- =============================================

-- Note: This will only insert if no materials exist for the company
-- You can customize this list based on your needs

INSERT INTO public.materials (company_id, name, category, subcategory, unit_type, unit_price, description)
SELECT 
  c.id,
  'Turtle Vent',
  'accessory',
  'vent',
  'each',
  8.50,
  'Low-profile roof ventilation'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE company_id = c.id AND name = 'Turtle Vent'
);

INSERT INTO public.materials (company_id, name, category, subcategory, unit_type, unit_price, description)
SELECT 
  c.id,
  'Dome Vent',
  'accessory',
  'vent',
  'each',
  12.00,
  'Round plastic roof vent'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE company_id = c.id AND name = 'Dome Vent'
);

INSERT INTO public.materials (company_id, name, category, subcategory, unit_type, unit_price, description)
SELECT 
  c.id,
  '3-in-1 Pipe Jack',
  'accessory',
  'pipe jack',
  'each',
  15.00,
  'Universal pipe flashing boot'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE company_id = c.id AND name = '3-in-1 Pipe Jack'
);

INSERT INTO public.materials (company_id, name, category, subcategory, unit_type, unit_price, description)
SELECT 
  c.id,
  'Ridge Vent',
  'accessory',
  'vent',
  'linear_foot',
  3.50,
  'Continuous ridge ventilation'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE company_id = c.id AND name = 'Ridge Vent'
);

INSERT INTO public.materials (company_id, name, category, subcategory, unit_type, unit_price, description)
SELECT 
  c.id,
  'Drip Edge',
  'accessory',
  'flashing',
  'linear_foot',
  1.50,
  'Aluminum drip edge flashing'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE company_id = c.id AND name = 'Drip Edge'
);

INSERT INTO public.materials (company_id, name, category, subcategory, unit_type, unit_price, description)
SELECT 
  c.id,
  'Ice & Water Shield',
  'underlayment',
  'ice_water',
  'roll',
  85.00,
  'Self-adhering waterproof underlayment'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE company_id = c.id AND name = 'Ice & Water Shield'
);

INSERT INTO public.materials (company_id, name, category, subcategory, unit_type, unit_price, description)
SELECT 
  c.id,
  'Synthetic Underlayment',
  'underlayment',
  'synthetic',
  'roll',
  65.00,
  'Synthetic roofing underlayment'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE company_id = c.id AND name = 'Synthetic Underlayment'
);
