-- =============================================
-- Add Supplier Material Pricing
-- =============================================
-- Allows locations to set supplier-specific pricing
-- for materials. This enables:
-- 1. Location default pricing (already exists in location_material_pricing)
-- 2. Location + Supplier specific pricing (this table)
-- 
-- Pricing waterfall:
-- 1. Location + Supplier price (most specific)
-- 2. Location default price
-- 3. Global material base price
-- =============================================

-- =============================================
-- PART 1: Supplier Material Pricing Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.supplier_material_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys (all required - always location-specific)
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  
  -- Pricing
  cost DECIMAL(10,2) NOT NULL CHECK (cost >= 0),
  effective_date DATE DEFAULT CURRENT_DATE,
  
  -- Optional supplier details
  supplier_sku TEXT, -- Supplier's part number for this material
  lead_time_days INTEGER, -- How long delivery takes
  minimum_order_qty INTEGER, -- Minimum order quantity
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints: One price per location per supplier per material
  CONSTRAINT unique_location_supplier_material 
    UNIQUE(location_id, supplier_id, material_id)
);

-- =============================================
-- PART 2: Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_supplier_material_pricing_location 
  ON public.supplier_material_pricing(location_id);

CREATE INDEX IF NOT EXISTS idx_supplier_material_pricing_supplier 
  ON public.supplier_material_pricing(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_material_pricing_material 
  ON public.supplier_material_pricing(material_id);

CREATE INDEX IF NOT EXISTS idx_supplier_material_pricing_location_supplier 
  ON public.supplier_material_pricing(location_id, supplier_id);

-- =============================================
-- PART 3: Triggers
-- =============================================

CREATE TRIGGER update_supplier_material_pricing_updated_at
  BEFORE UPDATE ON public.supplier_material_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PART 4: Row Level Security (RLS)
-- =============================================

ALTER TABLE public.supplier_material_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view supplier pricing for their company's locations
CREATE POLICY "Users can view their company's supplier pricing"
  ON public.supplier_material_pricing
  FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM public.locations 
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Admins and office users can manage supplier pricing
-- Office users can only manage pricing for their assigned locations
CREATE POLICY "Admins and office users can manage supplier pricing"
  ON public.supplier_material_pricing
  FOR ALL
  USING (
    location_id IN (
      SELECT id FROM public.locations 
      WHERE company_id IN (
        -- Company admins can manage all locations
        SELECT company_id FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    )
    OR
    location_id IN (
      -- Office users can manage their assigned locations
      SELECT location_id FROM public.location_users 
      WHERE user_id = auth.uid() 
      AND (
        location_role = 'location_admin' 
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'office'
      )
    )
  );

-- =============================================
-- PART 5: Comments
-- =============================================

COMMENT ON TABLE public.supplier_material_pricing IS 'Location and supplier-specific material pricing. Allows each location to set custom prices for materials from specific suppliers.';
COMMENT ON COLUMN public.supplier_material_pricing.location_id IS 'Location this pricing applies to (always required - no company-wide supplier pricing)';
COMMENT ON COLUMN public.supplier_material_pricing.supplier_id IS 'Supplier offering this price';
COMMENT ON COLUMN public.supplier_material_pricing.material_id IS 'Material being priced';
COMMENT ON COLUMN public.supplier_material_pricing.cost IS 'Supplier-specific cost for this material at this location';
COMMENT ON COLUMN public.supplier_material_pricing.supplier_sku IS 'Supplier''s part number or SKU for this material';
COMMENT ON COLUMN public.supplier_material_pricing.lead_time_days IS 'Typical delivery time in days from this supplier';
COMMENT ON COLUMN public.supplier_material_pricing.minimum_order_qty IS 'Minimum quantity required for this price';
