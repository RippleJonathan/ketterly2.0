-- Migration: Create material_variants table
-- Description: Allow materials to have multiple variants (colors, sizes, finishes, etc.)
-- Author: System
-- Date: 2024-12-08

-- Create material_variants table
CREATE TABLE IF NOT EXISTS public.material_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  
  -- Variant details
  variant_name TEXT NOT NULL,
  variant_type TEXT DEFAULT 'color' CHECK (variant_type IN ('color', 'size', 'finish', 'grade', 'other')),
  
  -- Optional: visual representation
  color_hex TEXT,
  
  -- Pricing (can differ by variant)
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  current_cost DECIMAL(10,2),
  
  -- SKU/Ordering
  sku TEXT,
  supplier_code TEXT,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Standard fields
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_material_variant UNIQUE(company_id, material_id, variant_name, deleted_at)
);

-- Add comment
COMMENT ON TABLE public.material_variants IS 'Stores material variants like colors, sizes, finishes for materials';

-- Create indexes
CREATE INDEX idx_material_variants_material_id ON public.material_variants(material_id);
CREATE INDEX idx_material_variants_company_id ON public.material_variants(company_id);
CREATE INDEX idx_material_variants_type ON public.material_variants(variant_type);
CREATE INDEX idx_material_variants_available ON public.material_variants(is_available) WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.material_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's material variants"
  ON public.material_variants
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert material variants for their company"
  ON public.material_variants
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's material variants"
  ON public.material_variants
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's material variants"
  ON public.material_variants
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_material_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER set_material_variants_updated_at
  BEFORE UPDATE ON public.material_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_material_variants_updated_at();

-- Add helper function to get variant display name
CREATE OR REPLACE FUNCTION get_variant_display_name(
  p_material_name TEXT,
  p_variant_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN p_material_name || ' - ' || p_variant_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_variant_display_name IS 'Returns formatted display name for material variant';
