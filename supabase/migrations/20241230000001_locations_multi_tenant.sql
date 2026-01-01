-- =====================================================
-- LOCATIONS/TEAMS MULTI-TENANT FEATURE
-- Allows companies to manage multiple branches/territories
-- with location-specific pricing, branding, and teams
-- =====================================================

-- =====================================================
-- 1. LOCATIONS TABLE (company branches/offices)
-- =====================================================
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Location identification
  name TEXT NOT NULL,
  location_code TEXT, -- "DFW-N", "AUS", etc. for order numbering
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Contact details
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Business details (location-specific overrides)
  license_number TEXT,
  tax_rate DECIMAL(5,4), -- Override company default if set
  
  -- Branding overrides (optional)
  logo_url TEXT, -- Use location-specific logo if set
  primary_color TEXT, -- Override company color if set
  
  -- Contract/warranty overrides (optional)
  contract_terms TEXT, -- Override company terms if set
  replacement_warranty_years INTEGER,
  repair_warranty_years INTEGER,
  
  -- Financing overrides (optional, can have location-specific financing)
  financing_option_1_name TEXT,
  financing_option_1_months INTEGER,
  financing_option_1_apr DECIMAL(5,2),
  financing_option_1_enabled BOOLEAN DEFAULT false,
  
  financing_option_2_name TEXT,
  financing_option_2_months INTEGER,
  financing_option_2_apr DECIMAL(5,2),
  financing_option_2_enabled BOOLEAN DEFAULT false,
  
  financing_option_3_name TEXT,
  financing_option_3_months INTEGER,
  financing_option_3_apr DECIMAL(5,2),
  financing_option_3_enabled BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_locations_company ON locations(company_id);
CREATE INDEX idx_locations_active ON locations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_primary ON locations(is_primary) WHERE is_primary = true AND deleted_at IS NULL;

-- Unique constraints (using partial indexes for WHERE clauses)
CREATE UNIQUE INDEX unique_location_name 
  ON locations(company_id, name) 
  WHERE deleted_at IS NULL;

-- Only one primary location per company
CREATE UNIQUE INDEX unique_primary_location 
  ON locations(company_id) 
  WHERE is_primary = true AND deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. LOCATION MATERIAL PRICING (override base cost)
-- =====================================================
CREATE TABLE public.location_material_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
  
  -- Override pricing
  cost DECIMAL(10,2) NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE,
  
  -- Optional location-specific supplier
  supplier_id UUID REFERENCES suppliers(id),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_location_material_pricing_location ON location_material_pricing(location_id);
CREATE INDEX idx_location_material_pricing_material ON location_material_pricing(material_id);

-- One price per location per material
ALTER TABLE location_material_pricing ADD CONSTRAINT unique_location_material 
  UNIQUE (location_id, material_id);

-- Trigger for updated_at
CREATE TRIGGER update_location_material_pricing_updated_at
  BEFORE UPDATE ON location_material_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. LOCATION LABOR RATES (override default rates)
-- =====================================================
CREATE TABLE public.location_labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  
  -- Labor description or template reference
  template_id UUID REFERENCES labor_templates(id),
  description TEXT NOT NULL, -- "Tear-off labor", "Installation", etc.
  category TEXT, -- "roofing", "siding", etc.
  
  -- Rate override
  hourly_rate DECIMAL(10,2),
  flat_rate DECIMAL(10,2),
  
  -- Metadata
  effective_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_location_labor_rates_location ON location_labor_rates(location_id);
CREATE INDEX idx_location_labor_rates_template ON location_labor_rates(template_id);

-- One rate per location per template (if template_id is used)
CREATE UNIQUE INDEX unique_location_template_rate 
  ON location_labor_rates(location_id, template_id) 
  WHERE template_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_location_labor_rates_updated_at
  BEFORE UPDATE ON location_labor_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. LOCATION TEAM ASSIGNMENTS
-- =====================================================
CREATE TABLE public.location_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Role at this location
  location_role TEXT DEFAULT 'member' CHECK (location_role IN (
    'location_admin', -- Can manage location settings
    'manager',        -- Can manage leads/quotes for location
    'member'          -- Regular access
  )),
  
  -- Metadata
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_location_users_location ON location_users(location_id);
CREATE INDEX idx_location_users_user ON location_users(user_id);

-- One role per user per location
ALTER TABLE location_users ADD CONSTRAINT unique_location_user 
  UNIQUE (location_id, user_id);

-- =====================================================
-- 5. UPDATE EXISTING TABLES - ADD LOCATION REFERENCES
-- =====================================================

-- Leads
ALTER TABLE leads 
ADD COLUMN location_id UUID REFERENCES locations(id);

CREATE INDEX idx_leads_location ON leads(location_id);

-- Quotes
ALTER TABLE quotes 
ADD COLUMN location_id UUID REFERENCES locations(id);

CREATE INDEX idx_quotes_location ON quotes(location_id);

-- Material Orders
ALTER TABLE material_orders 
ADD COLUMN location_id UUID REFERENCES locations(id);

CREATE INDEX idx_material_orders_location ON material_orders(location_id);

-- Work Orders
ALTER TABLE work_orders 
ADD COLUMN location_id UUID REFERENCES locations(id);

CREATE INDEX idx_work_orders_location ON work_orders(location_id);

-- Calendar Events
ALTER TABLE calendar_events 
ADD COLUMN location_id UUID REFERENCES locations(id);

CREATE INDEX idx_calendar_events_location ON calendar_events(location_id);

-- Users - replace assigned_territories with default_location_id
ALTER TABLE users 
ADD COLUMN default_location_id UUID REFERENCES locations(id);

CREATE INDEX idx_users_default_location ON users(default_location_id);

-- Note: We keep assigned_territories for now for backward compatibility
-- Drop it in a future migration after data migration is complete

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's locations"
  ON locations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage locations"
  ON locations FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
        AND role IN ('super_admin', 'admin', 'office')
    )
  );

CREATE POLICY "Location admins can update their locations"
  ON locations FOR UPDATE
  USING (
    id IN (
      SELECT location_id 
      FROM location_users 
      WHERE user_id = auth.uid() 
        AND location_role = 'location_admin'
    )
  );

-- Location Material Pricing
ALTER TABLE location_material_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's location pricing"
  ON location_material_pricing FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage location pricing"
  ON location_material_pricing FOR ALL
  USING (
    location_id IN (
      SELECT id FROM locations 
      WHERE company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid() 
          AND role IN ('super_admin', 'admin', 'office')
      )
    )
  );

-- Location Labor Rates
ALTER TABLE location_labor_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's location labor rates"
  ON location_labor_rates FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage location labor rates"
  ON location_labor_rates FOR ALL
  USING (
    location_id IN (
      SELECT id FROM locations 
      WHERE company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid() 
          AND role IN ('super_admin', 'admin', 'office')
      )
    )
  );

-- Location Users
ALTER TABLE location_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view location team assignments in their company"
  ON location_users FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage location team assignments"
  ON location_users FOR ALL
  USING (
    location_id IN (
      SELECT id FROM locations 
      WHERE company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid() 
          AND role IN ('super_admin', 'admin', 'office')
      )
    )
  );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to get material cost with location override
CREATE OR REPLACE FUNCTION get_material_cost(
  p_material_id UUID,
  p_location_id UUID DEFAULT NULL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_cost DECIMAL(10,2);
BEGIN
  -- Try location-specific pricing first
  IF p_location_id IS NOT NULL THEN
    SELECT cost INTO v_cost
    FROM location_material_pricing
    WHERE material_id = p_material_id
      AND location_id = p_location_id
    LIMIT 1;
    
    IF v_cost IS NOT NULL THEN
      RETURN v_cost;
    END IF;
  END IF;
  
  -- Fall back to base material cost
  SELECT current_cost INTO v_cost
  FROM materials
  WHERE id = p_material_id;
  
  RETURN COALESCE(v_cost, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE locations IS 'Company branches/offices with location-specific settings';
COMMENT ON TABLE location_material_pricing IS 'Location-specific material cost overrides';
COMMENT ON TABLE location_labor_rates IS 'Location-specific labor rate overrides';
COMMENT ON TABLE location_users IS 'Team assignments and roles per location';
COMMENT ON FUNCTION get_material_cost IS 'Get material cost with location override waterfall';
