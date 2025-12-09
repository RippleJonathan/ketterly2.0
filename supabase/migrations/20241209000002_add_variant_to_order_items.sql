-- Add variant support to material order items
-- This allows storing which variant (color, size, finish, etc.) was selected for each item

-- Add variant fields to material_order_items
ALTER TABLE public.material_order_items
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id),
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.material_variants(id),
  ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_material_order_items_material_id ON public.material_order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_material_order_items_variant_id ON public.material_order_items(variant_id);

-- Add comments
COMMENT ON COLUMN public.material_order_items.material_id IS 'Reference to the material from materials table (if applicable)';
COMMENT ON COLUMN public.material_order_items.variant_id IS 'Reference to the selected variant (color, size, finish, etc.)';
COMMENT ON COLUMN public.material_order_items.variant_name IS 'Cached variant name for display purposes';
