-- Migration: Create Work Orders System for Subcontractor Labor
-- Description: Parallel system to material_orders but for labor/subcontractor work
-- Created: 2024-12-06

-- =====================================================
-- 1. SUBCONTRACTORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Business Details
  trade_specialties TEXT[], -- e.g., ['roofing', 'siding', 'gutters']
  license_number TEXT,
  insurance_expiry DATE,
  w9_on_file BOOLEAN DEFAULT false,
  
  -- Payment Terms
  payment_terms TEXT DEFAULT 'Net 30', -- Net 15, Net 30, COD, etc.
  preferred_payment_method TEXT, -- check, ACH, credit_card
  
  -- Performance Tracking
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  total_jobs_completed INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT unique_company_subcontractor UNIQUE(company_id, company_name)
);

CREATE INDEX idx_subcontractors_company_id ON public.subcontractors(company_id);
CREATE INDEX idx_subcontractors_is_active ON public.subcontractors(is_active) WHERE deleted_at IS NULL;

-- =====================================================
-- 2. WORK ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Subcontractor (OPTIONAL)
  subcontractor_id UUID REFERENCES public.subcontractors(id) ON DELETE RESTRICT,
  subcontractor_name TEXT, -- Denormalized for history (nullable if no subcontractor)
  subcontractor_email TEXT,
  subcontractor_phone TEXT,
  
  -- Work Order Details
  work_order_number TEXT, -- e.g., "WO-2024-001"
  title TEXT NOT NULL, -- e.g., "Roof Tear-off and Disposal"
  description TEXT,
  
  -- Scheduling
  scheduled_date DATE,
  estimated_duration_hours DECIMAL(5,1), -- e.g., 8.5 hours
  actual_start_date DATE,
  actual_completion_date DATE,
  
  -- Location
  job_site_address TEXT NOT NULL,
  job_site_city TEXT,
  job_site_state TEXT,
  job_site_zip TEXT,
  
  -- Pricing
  labor_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  materials_cost DECIMAL(10,2) DEFAULT 0, -- If subcontractor supplies materials
  equipment_cost DECIMAL(10,2) DEFAULT 0,
  other_costs DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'sent',
      'accepted',
      'scheduled',
      'in_progress',
      'completed',
      'cancelled'
    )),
  
  -- Pickup/Delivery (if materials involved)
  requires_materials BOOLEAN DEFAULT false,
  materials_will_be_provided BOOLEAN DEFAULT true, -- By company vs subcontractor
  
  -- Payment Tracking
  is_paid BOOLEAN DEFAULT false,
  payment_date DATE,
  payment_amount DECIMAL(10,2),
  payment_method TEXT
    CHECK (payment_method IN (
      'cash',
      'check',
      'credit_card',
      'wire_transfer',
      'company_account',
      'other'
    ) OR payment_method IS NULL),
  payment_notes TEXT,
  
  -- Communication
  last_emailed_at TIMESTAMPTZ,
  email_count INTEGER DEFAULT 0,
  
  -- Internal Notes
  internal_notes TEXT,
  special_instructions TEXT,
  
  -- Safety & Compliance
  insurance_verified BOOLEAN DEFAULT false,
  safety_requirements TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_work_orders_company_id ON public.work_orders(company_id);
CREATE INDEX idx_work_orders_lead_id ON public.work_orders(lead_id);
CREATE INDEX idx_work_orders_subcontractor_id ON public.work_orders(subcontractor_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_scheduled_date ON public.work_orders(scheduled_date) WHERE deleted_at IS NULL;

-- =====================================================
-- 3. WORK ORDER LINE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.work_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  
  -- Line Item Details
  item_type TEXT NOT NULL CHECK (item_type IN ('labor', 'materials', 'equipment', 'other')),
  description TEXT NOT NULL,
  
  -- Quantity & Pricing
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'hour', -- hour, day, square, each, etc.
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_order_line_items_work_order_id ON public.work_order_line_items(work_order_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

-- Subcontractors RLS
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's subcontractors"
  ON public.subcontractors
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subcontractors for their company"
  ON public.subcontractors
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's subcontractors"
  ON public.subcontractors
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's subcontractors"
  ON public.subcontractors
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Work Orders RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's work orders"
  ON public.work_orders
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert work orders for their company"
  ON public.work_orders
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's work orders"
  ON public.work_orders
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's work orders"
  ON public.work_orders
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Work Order Line Items RLS
ALTER TABLE public.work_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view line items for their company's work orders"
  ON public.work_order_line_items
  FOR SELECT
  USING (
    work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert line items for their company's work orders"
  ON public.work_order_line_items
  FOR INSERT
  WITH CHECK (
    work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update line items for their company's work orders"
  ON public.work_order_line_items
  FOR UPDATE
  USING (
    work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete line items for their company's work orders"
  ON public.work_order_line_items
  FOR DELETE
  USING (
    work_order_id IN (
      SELECT id FROM public.work_orders
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subcontractors_updated_at
  BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_order_line_items_updated_at
  BEFORE UPDATE ON public.work_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON TABLE public.subcontractors IS 'Manages subcontractor companies for labor work orders';
COMMENT ON TABLE public.work_orders IS 'Work orders for subcontractor labor and services';
COMMENT ON TABLE public.work_order_line_items IS 'Individual line items for work orders (labor, materials, equipment)';

COMMENT ON COLUMN public.subcontractors.trade_specialties IS 'Array of specialties: roofing, siding, gutters, etc.';
COMMENT ON COLUMN public.work_orders.status IS 'Workflow: draft → sent → accepted → scheduled → in_progress → completed';
COMMENT ON COLUMN public.work_orders.materials_will_be_provided IS 'true = company provides, false = subcontractor provides';
