-- =============================================
-- Migration: Production System (Material Orders, Templates, Crew, Invoices)
-- Date: 2024-12-05
-- Description: 
--   1. Suppliers/Subcontractors table
--   2. Material Templates (auto-generate orders from measurements)
--   3. Material Orders with actual cost tracking
--   4. Invoice document uploads
--   5. Crew roles (foreman, laborer)
--   6. Extend quote_line_items for estimated vs actual costs
-- =============================================

-- =====================================================
-- PART 1: Suppliers & Subcontractors
-- =====================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('material_supplier', 'subcontractor', 'both')) DEFAULT 'material_supplier',
  
  -- Contact info
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Details
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON public.suppliers(type) WHERE is_active = true;

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's suppliers"
  ON public.suppliers
  FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.suppliers IS 'Material suppliers and subcontractors (both in one table)';

-- =====================================================
-- PART 2: Material Templates (The Smart Part!)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.material_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  
  -- Template info
  name TEXT NOT NULL, -- "CertainTeed ClimateFlex", "GAF Natural Shadow"
  description TEXT,
  
  -- Category (for filtering)
  category TEXT DEFAULT 'roofing', -- 'roofing', 'siding', 'windows', etc.
  
  -- Template configuration (JSON)
  -- Example: [
  --   { item: "Shingles", unit: "bundle", per_square: 3, description: "CertainTeed ClimateFlex Architectural" },
  --   { item: "Underlayment", unit: "roll", per_square: 0.1, description: "Synthetic underlayment" },
  --   { item: "Nails", unit: "box", per_square: 0.067, description: "Roofing nails 1.25\"" }
  -- ]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_material_templates_company_id ON public.material_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_material_templates_category ON public.material_templates(category) WHERE is_active = true;

-- RLS
ALTER TABLE public.material_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's material templates"
  ON public.material_templates
  FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.material_templates IS 'Material templates for auto-generating orders from measurements (e.g., 30 squares × 3 bundles/square = 90 bundles)';
COMMENT ON COLUMN public.material_templates.items IS 'Array of template items with conversion rates: [{ item, unit, per_square, description }]';

-- =====================================================
-- PART 3: Extend Quote Line Items for Actual Costs
-- =====================================================

ALTER TABLE public.quote_line_items 
ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('estimate', 'material', 'labor', 'permit', 'equipment', 'other')) DEFAULT 'estimate',
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2), -- What we quoted to customer
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2);    -- What we actually paid

CREATE INDEX IF NOT EXISTS idx_quote_line_items_supplier_id ON public.quote_line_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_item_type ON public.quote_line_items(item_type);

COMMENT ON COLUMN public.quote_line_items.item_type IS 'Type of line item: estimate (quote only), material (trackable), labor (trackable), etc.';
COMMENT ON COLUMN public.quote_line_items.estimated_cost IS 'Estimated cost (for profit margin tracking)';
COMMENT ON COLUMN public.quote_line_items.actual_cost IS 'Actual cost paid (updated when invoice received)';

-- =====================================================
-- PART 4: Material Orders
-- =====================================================

CREATE TABLE IF NOT EXISTS public.material_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  
  -- Order identification
  order_number TEXT NOT NULL UNIQUE, -- Auto-generated: MO-2024-001
  
  -- Supplier
  supplier_id UUID REFERENCES public.suppliers(id),
  
  -- Template used (if any)
  template_id UUID REFERENCES public.material_templates(id),
  template_name TEXT, -- Snapshot of template name at time of order
  
  -- Status workflow
  status TEXT NOT NULL CHECK (status IN (
    'draft',        -- Being prepared
    'ordered',      -- Sent to supplier
    'confirmed',    -- Supplier confirmed
    'in_transit',   -- On the way
    'delivered',    -- Received
    'cancelled'     -- Cancelled
  )) DEFAULT 'draft',
  
  -- Dates
  order_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Totals
  total_estimated DECIMAL(10,2) DEFAULT 0,
  total_actual DECIMAL(10,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  delivery_notes TEXT, -- Notes about delivery (e.g., "Left at side gate")
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_material_orders_company_id ON public.material_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_material_orders_lead_id ON public.material_orders(lead_id);
CREATE INDEX IF NOT EXISTS idx_material_orders_supplier_id ON public.material_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_orders_status ON public.material_orders(status);

-- RLS
ALTER TABLE public.material_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's material orders"
  ON public.material_orders
  FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.material_orders IS 'Material orders for projects - can be generated from templates or created manually';

-- =====================================================
-- PART 5: Material Order Line Items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.material_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.material_orders(id) ON DELETE CASCADE NOT NULL,
  
  -- Item details
  description TEXT NOT NULL, -- "CertainTeed ClimateFlex Shingles"
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL, -- "bundle", "roll", "box", "sqft"
  
  -- Costs
  estimated_unit_cost DECIMAL(10,2),
  actual_unit_cost DECIMAL(10,2),
  estimated_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * COALESCE(estimated_unit_cost, 0)) STORED,
  actual_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * COALESCE(actual_unit_cost, 0)) STORED,
  
  -- Optional link to quote line item
  quote_line_item_id UUID REFERENCES public.quote_line_items(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_order_items_order_id ON public.material_order_items(order_id);

-- RLS
ALTER TABLE public.material_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's material order items"
  ON public.material_order_items
  FOR ALL
  USING (
    order_id IN (
      SELECT id FROM public.material_orders 
      WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
  );

COMMENT ON TABLE public.material_order_items IS 'Line items for material orders - tracks estimated vs actual costs';

-- =====================================================
-- PART 6: Invoice Documents (for upload tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.order_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  order_id UUID REFERENCES public.material_orders(id) ON DELETE CASCADE NOT NULL,
  
  -- Invoice info
  invoice_number TEXT, -- Supplier's invoice number
  invoice_date DATE,
  amount DECIMAL(10,2) NOT NULL,
  
  -- Document
  document_url TEXT, -- Path in Supabase Storage
  document_name TEXT,
  
  -- Status
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  payment_method TEXT, -- "check", "credit_card", "ach", etc.
  
  -- Metadata
  notes TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_invoices_company_id ON public.order_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_order_id ON public.order_invoices(order_id);

-- RLS
ALTER TABLE public.order_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's order invoices"
  ON public.order_invoices
  FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.order_invoices IS 'Uploaded supplier invoices - tracks multiple invoices per order (partial deliveries)';

-- =====================================================
-- PART 7: Crew Roles & Teams
-- =====================================================

-- Extend users table for crew roles
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS crew_role TEXT CHECK (crew_role IN ('foreman', 'laborer', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS foreman_id UUID REFERENCES public.users(id); -- If laborer, who's their foreman

CREATE INDEX IF NOT EXISTS idx_users_crew_role ON public.users(crew_role) WHERE crew_role != 'none';
CREATE INDEX IF NOT EXISTS idx_users_foreman_id ON public.users(foreman_id);

COMMENT ON COLUMN public.users.crew_role IS 'Crew role: foreman (can manage team), laborer (assigned to foreman), or none (office staff)';
COMMENT ON COLUMN public.users.foreman_id IS 'If crew_role=laborer, references the foreman they work under';

-- Crew assignments to leads (many-to-many)
CREATE TABLE IF NOT EXISTS public.lead_crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Assignment details
  role TEXT CHECK (role IN ('foreman', 'laborer')),
  assigned_date DATE DEFAULT CURRENT_DATE,
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(lead_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_crew_assignments_company_id ON public.lead_crew_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_crew_assignments_lead_id ON public.lead_crew_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_crew_assignments_user_id ON public.lead_crew_assignments(user_id);

-- RLS
ALTER TABLE public.lead_crew_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's crew assignments"
  ON public.lead_crew_assignments
  FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.lead_crew_assignments IS 'Crew members assigned to projects (many-to-many relationship)';

-- =====================================================
-- PART 8: Auto-Generate Order Numbers
-- =====================================================

CREATE OR REPLACE FUNCTION generate_material_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_order_number TEXT;
BEGIN
  IF NEW.order_number IS NULL THEN
    -- Get next number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'MO-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.material_orders
    WHERE company_id = NEW.company_id
      AND order_number ~ '^MO-\d{4}-\d+$';
    
    -- Generate order number: MO-YYYY-001
    new_order_number := 'MO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 3, '0');
    
    NEW.order_number := new_order_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_material_order_number
  BEFORE INSERT ON public.material_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_material_order_number();

-- =====================================================
-- PART 9: Update Material Order Totals on Item Changes
-- =====================================================

CREATE OR REPLACE FUNCTION update_material_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  new_estimated DECIMAL(10,2);
  new_actual DECIMAL(10,2);
BEGIN
  -- Calculate totals from line items
  SELECT 
    COALESCE(SUM(estimated_total), 0),
    COALESCE(SUM(actual_total), 0)
  INTO new_estimated, new_actual
  FROM public.material_order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Update the order
  UPDATE public.material_orders
  SET 
    total_estimated = new_estimated,
    total_actual = new_actual,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.material_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_material_order_totals();

-- =====================================================
-- PART 10: Update Timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_timestamp
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_material_templates_timestamp
  BEFORE UPDATE ON public.material_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_material_orders_timestamp
  BEFORE UPDATE ON public.material_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_material_order_items_timestamp
  BEFORE UPDATE ON public.material_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_order_invoices_timestamp
  BEFORE UPDATE ON public.order_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- PART 11: Sample Data (Optional - for testing)
-- =====================================================

-- Uncomment to add sample suppliers and templates

/*
-- Sample Supplier
INSERT INTO public.suppliers (company_id, name, type, contact_name, email, phone, is_active)
SELECT 
  company_id,
  'ABC Roofing Supply',
  'material_supplier',
  'John Smith',
  'john@abcsupply.com',
  '555-123-4567',
  true
FROM public.companies
LIMIT 1;

-- Sample Material Template: CertainTeed ClimateFlex
INSERT INTO public.material_templates (company_id, name, description, category, items, created_by)
SELECT 
  c.id,
  'CertainTeed ClimateFlex',
  'Standard CertainTeed ClimateFlex roofing system',
  'roofing',
  '[
    {"item": "Shingles", "unit": "bundle", "per_square": 3, "description": "CertainTeed ClimateFlex Architectural"},
    {"item": "Underlayment", "unit": "roll", "per_square": 0.1, "description": "Synthetic underlayment"},
    {"item": "Nails", "unit": "box", "per_square": 0.067, "description": "Roofing nails 1.25\""},
    {"item": "Ridge Cap", "unit": "bundle", "per_square": 0.2, "description": "Hip & ridge shingles"},
    {"item": "Starter Strip", "unit": "bundle", "per_square": 0.15, "description": "Starter shingles"}
  ]'::jsonb,
  (SELECT id FROM public.users WHERE company_id = c.id AND role = 'admin' LIMIT 1)
FROM public.companies c
LIMIT 1;

-- Sample Material Template: GAF Natural Shadow
INSERT INTO public.material_templates (company_id, name, description, category, items, created_by)
SELECT 
  c.id,
  'GAF Natural Shadow',
  'GAF Natural Shadow roofing system',
  'roofing',
  '[
    {"item": "Shingles", "unit": "bundle", "per_square": 3, "description": "GAF Natural Shadow"},
    {"item": "Underlayment", "unit": "roll", "per_square": 0.1, "description": "GAF FeltBuster"},
    {"item": "Nails", "unit": "box", "per_square": 0.067, "description": "Roofing nails 1.25\""},
    {"item": "Ridge Cap", "unit": "bundle", "per_square": 0.2, "description": "GAF Seal-A-Ridge"},
    {"item": "Starter Strip", "unit": "roll", "per_square": 0.05, "description": "GAF WeatherWatch"}
  ]'::jsonb,
  (SELECT id FROM public.users WHERE company_id = c.id AND role = 'admin' LIMIT 1)
FROM public.companies c
LIMIT 1;
*/
