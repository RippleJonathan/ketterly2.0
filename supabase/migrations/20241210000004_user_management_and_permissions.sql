-- User Management & Permissions System
-- Adds commission plans, detailed permissions, and user profile enhancements

-- =====================================================
-- COMMISSION PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  
  -- Plan details
  name TEXT NOT NULL, -- e.g., "Sales Rep Standard", "Project Manager", "Installer"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Commission structure
  commission_type TEXT NOT NULL CHECK (commission_type IN (
    'percentage',      -- % of job total
    'flat_per_job',    -- Fixed amount per completed job
    'tiered',          -- Different % based on volume
    'hourly_plus',     -- Hourly wage + commission
    'salary_plus'      -- Salary + commission
  )) DEFAULT 'percentage',
  
  -- Percentage-based
  commission_rate DECIMAL(5,2), -- e.g., 5.00 for 5%
  
  -- Flat amount
  flat_amount DECIMAL(10,2),
  
  -- Tiered structure (JSON)
  tier_structure JSONB, -- [{ min: 0, max: 50000, rate: 3 }, { min: 50000, max: null, rate: 5 }]
  
  -- Base compensation
  hourly_rate DECIMAL(10,2),
  salary_amount DECIMAL(10,2),
  
  -- What to calculate commission on
  calculate_on TEXT DEFAULT 'revenue' CHECK (calculate_on IN (
    'revenue',         -- Total job revenue
    'profit',          -- Job profit (revenue - costs)
    'collected'        -- Money actually collected
  )),
  
  -- Payment timing
  paid_when TEXT DEFAULT 'completed' CHECK (paid_when IN (
    'signed',          -- When contract signed
    'deposit',         -- When deposit received
    'completed',       -- When job completed
    'collected'        -- When payment collected
  )),
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_commission_plans_company_id ON public.commission_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_commission_plans_is_active ON public.commission_plans(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.commission_plans IS 'Commission and pay structures for different roles/positions';

-- =====================================================
-- PERMISSIONS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Leads & Projects
  can_view_leads BOOLEAN DEFAULT false,
  can_create_leads BOOLEAN DEFAULT false,
  can_edit_leads BOOLEAN DEFAULT false,
  can_delete_leads BOOLEAN DEFAULT false,
  can_view_all_leads BOOLEAN DEFAULT false, -- Or only assigned leads
  
  -- Quotes
  can_view_quotes BOOLEAN DEFAULT false,
  can_create_quotes BOOLEAN DEFAULT false,
  can_edit_quotes BOOLEAN DEFAULT false,
  can_delete_quotes BOOLEAN DEFAULT false,
  can_approve_quotes BOOLEAN DEFAULT false,
  can_send_quotes BOOLEAN DEFAULT false,
  
  -- Invoices & Payments
  can_view_invoices BOOLEAN DEFAULT false,
  can_create_invoices BOOLEAN DEFAULT false,
  can_edit_invoices BOOLEAN DEFAULT false,
  can_delete_invoices BOOLEAN DEFAULT false,
  can_record_payments BOOLEAN DEFAULT false,
  can_void_payments BOOLEAN DEFAULT false,
  
  -- Material Orders
  can_view_material_orders BOOLEAN DEFAULT false,
  can_create_material_orders BOOLEAN DEFAULT false,
  can_edit_material_orders BOOLEAN DEFAULT false,
  can_delete_material_orders BOOLEAN DEFAULT false,
  can_mark_orders_paid BOOLEAN DEFAULT false,
  
  -- Work Orders
  can_view_work_orders BOOLEAN DEFAULT false,
  can_create_work_orders BOOLEAN DEFAULT false,
  can_edit_work_orders BOOLEAN DEFAULT false,
  can_delete_work_orders BOOLEAN DEFAULT false,
  can_assign_crew BOOLEAN DEFAULT false,
  
  -- Customers
  can_view_customers BOOLEAN DEFAULT false,
  can_create_customers BOOLEAN DEFAULT false,
  can_edit_customers BOOLEAN DEFAULT false,
  can_delete_customers BOOLEAN DEFAULT false,
  
  -- Financials & Reports
  can_view_financials BOOLEAN DEFAULT false,
  can_view_profit_margins BOOLEAN DEFAULT false,
  can_view_commission_reports BOOLEAN DEFAULT false,
  can_export_reports BOOLEAN DEFAULT false,
  
  -- Users & Settings
  can_view_users BOOLEAN DEFAULT false,
  can_create_users BOOLEAN DEFAULT false,
  can_edit_users BOOLEAN DEFAULT false,
  can_delete_users BOOLEAN DEFAULT false,
  can_manage_permissions BOOLEAN DEFAULT false,
  can_edit_company_settings BOOLEAN DEFAULT false,
  
  -- Production
  can_upload_photos BOOLEAN DEFAULT false,
  can_update_project_status BOOLEAN DEFAULT false,
  can_view_project_timeline BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_user_permissions UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);

COMMENT ON TABLE public.user_permissions IS 'Granular permissions for each user - overrides role defaults';

-- =====================================================
-- ROLE TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  
  name TEXT NOT NULL, -- e.g., "Sales Representative", "Project Manager", "Installer"
  description TEXT,
  base_role TEXT NOT NULL CHECK (base_role IN ('admin', 'manager', 'user')),
  
  -- Default permissions (same structure as user_permissions)
  default_permissions JSONB NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_role_templates_company_id ON public.role_templates(company_id);

COMMENT ON TABLE public.role_templates IS 'Reusable permission templates for common roles';

-- =====================================================
-- EXTEND USERS TABLE
-- =====================================================

-- Add commission and profile fields to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS commission_plan_id UUID REFERENCES public.commission_plans(id),
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[], -- e.g., ['Asphalt Shingles', 'Metal Roofing']
ADD COLUMN IF NOT EXISTS certifications TEXT[], -- e.g., ['GAF Master Elite', 'OSHA 10']
ADD COLUMN IF NOT EXISTS assigned_territories TEXT[]; -- e.g., ['Dallas', 'Fort Worth']

CREATE INDEX IF NOT EXISTS idx_users_commission_plan_id ON public.users(commission_plan_id);

COMMENT ON COLUMN public.users.commission_plan_id IS 'Commission structure assigned to this user';
COMMENT ON COLUMN public.users.specialties IS 'Areas of expertise for this user';
COMMENT ON COLUMN public.users.certifications IS 'Professional certifications';

-- =====================================================
-- USER COMMISSION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  
  -- Commission details
  commission_plan_id UUID REFERENCES public.commission_plans(id),
  calculated_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Calculation basis
  job_revenue DECIMAL(10,2),
  job_profit DECIMAL(10,2),
  job_collected DECIMAL(10,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',         -- Job not complete yet
    'approved',        -- Ready to pay
    'paid',            -- Commission paid
    'held',            -- Payment on hold
    'voided'           -- Commission cancelled
  )),
  
  paid_date DATE,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_commissions_company_id ON public.user_commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_commissions_user_id ON public.user_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_commissions_lead_id ON public.user_commissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_user_commissions_status ON public.user_commissions(status);

COMMENT ON TABLE public.user_commissions IS 'Tracks earned and paid commissions for each user per job';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Commission Plans
ALTER TABLE public.commission_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's commission plans"
  ON public.commission_plans FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage commission plans"
  ON public.commission_plans FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- User Permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage permissions"
  ON public.user_permissions FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
    )
  );

-- Role Templates
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's role templates"
  ON public.role_templates FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage role templates"
  ON public.role_templates FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- User Commissions
ALTER TABLE public.user_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own commissions"
  ON public.user_commissions FOR SELECT
  USING (
    user_id = auth.uid() OR
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage commissions"
  ON public.user_commissions FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- DEFAULT ROLE TEMPLATES (Insert after company creation)
-- =====================================================

-- Function to create default role templates for new companies
CREATE OR REPLACE FUNCTION create_default_role_templates(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Admin role template
  INSERT INTO public.role_templates (company_id, name, description, base_role, default_permissions)
  VALUES (
    p_company_id,
    'Administrator',
    'Full access to all features and settings',
    'admin',
    '{
      "can_view_leads": true,
      "can_create_leads": true,
      "can_edit_leads": true,
      "can_delete_leads": true,
      "can_view_all_leads": true,
      "can_view_quotes": true,
      "can_create_quotes": true,
      "can_edit_quotes": true,
      "can_delete_quotes": true,
      "can_approve_quotes": true,
      "can_send_quotes": true,
      "can_view_invoices": true,
      "can_create_invoices": true,
      "can_edit_invoices": true,
      "can_delete_invoices": true,
      "can_record_payments": true,
      "can_void_payments": true,
      "can_view_material_orders": true,
      "can_create_material_orders": true,
      "can_edit_material_orders": true,
      "can_delete_material_orders": true,
      "can_mark_orders_paid": true,
      "can_view_work_orders": true,
      "can_create_work_orders": true,
      "can_edit_work_orders": true,
      "can_delete_work_orders": true,
      "can_assign_crew": true,
      "can_view_customers": true,
      "can_create_customers": true,
      "can_edit_customers": true,
      "can_delete_customers": true,
      "can_view_financials": true,
      "can_view_profit_margins": true,
      "can_view_commission_reports": true,
      "can_export_reports": true,
      "can_view_users": true,
      "can_create_users": true,
      "can_edit_users": true,
      "can_delete_users": true,
      "can_manage_permissions": true,
      "can_edit_company_settings": true,
      "can_upload_photos": true,
      "can_update_project_status": true,
      "can_view_project_timeline": true
    }'::jsonb
  );
  
  -- Sales Representative template
  INSERT INTO public.role_templates (company_id, name, description, base_role, default_permissions)
  VALUES (
    p_company_id,
    'Sales Representative',
    'Can manage leads and quotes, view assigned projects',
    'user',
    '{
      "can_view_leads": true,
      "can_create_leads": true,
      "can_edit_leads": true,
      "can_delete_leads": false,
      "can_view_all_leads": false,
      "can_view_quotes": true,
      "can_create_quotes": true,
      "can_edit_quotes": true,
      "can_delete_quotes": false,
      "can_approve_quotes": false,
      "can_send_quotes": true,
      "can_view_invoices": true,
      "can_create_invoices": false,
      "can_view_customers": true,
      "can_create_customers": true,
      "can_edit_customers": true,
      "can_view_financials": false,
      "can_view_commission_reports": true,
      "can_upload_photos": true,
      "can_view_project_timeline": true
    }'::jsonb
  );
  
  -- Project Manager template
  INSERT INTO public.role_templates (company_id, name, description, base_role, default_permissions)
  VALUES (
    p_company_id,
    'Project Manager',
    'Can manage projects, orders, and crew assignments',
    'manager',
    '{
      "can_view_leads": true,
      "can_edit_leads": true,
      "can_view_all_leads": true,
      "can_view_quotes": true,
      "can_view_material_orders": true,
      "can_create_material_orders": true,
      "can_edit_material_orders": true,
      "can_mark_orders_paid": true,
      "can_view_work_orders": true,
      "can_create_work_orders": true,
      "can_edit_work_orders": true,
      "can_assign_crew": true,
      "can_view_customers": true,
      "can_view_financials": true,
      "can_view_profit_margins": true,
      "can_upload_photos": true,
      "can_update_project_status": true,
      "can_view_project_timeline": true
    }'::jsonb
  );
  
  -- Field Crew template
  INSERT INTO public.role_templates (company_id, name, description, base_role, default_permissions)
  VALUES (
    p_company_id,
    'Field Crew',
    'Can view assigned projects and update status',
    'user',
    '{
      "can_view_leads": true,
      "can_view_all_leads": false,
      "can_view_work_orders": true,
      "can_upload_photos": true,
      "can_update_project_status": true,
      "can_view_project_timeline": true
    }'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_role_templates IS 'Creates default role templates when a new company is created';
