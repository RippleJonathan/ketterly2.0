-- =====================================================
-- KETTERLY CRM - MULTI-TENANT DATABASE SCHEMA
-- Migration: 20241127000001_init_multi_tenant_schema
-- Description: Initial schema for multi-tenant SaaS CRM
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Companies (Tenants)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'starter', 'professional', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'paused', 'cancelled', 'expired')),
  trial_ends_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create index on slug for fast lookups
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_deleted_at ON companies(deleted_at);

-- Users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'manager', 'user')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- =====================================================
-- CUSTOMER MANAGEMENT
-- =====================================================

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  customer_type TEXT DEFAULT 'residential' CHECK (customer_type IN ('residential', 'commercial', 'property_manager')),
  source TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);

-- =====================================================
-- LEAD MANAGEMENT
-- =====================================================

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'referral', 'facebook', 'google', 'yard_sign', 'door_hanger', 'phone', 'other')),
  service_type TEXT NOT NULL DEFAULT 'repair' CHECK (service_type IN ('repair', 'replacement', 'inspection', 'maintenance', 'emergency', 'gutter', 'siding', 'other')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'quote_sent', 'follow_up', 'won', 'lost', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_value DECIMAL(10, 2),
  notes TEXT,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_leads_company_id ON leads(company_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_deleted_at ON leads(deleted_at);

-- =====================================================
-- ACTIVITY TRACKING
-- =====================================================

-- Activities (universal activity log)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'customer', 'quote', 'project', 'invoice')),
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'sms', 'meeting', 'status_change', 'file_upload', 'payment', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_activities_company_id ON activities(company_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_activities_deleted_at ON activities(deleted_at);

-- =====================================================
-- QUOTES
-- =====================================================

-- Quotes
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  quote_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  title TEXT NOT NULL,
  description TEXT,
  service_address TEXT,
  service_city TEXT,
  service_state TEXT,
  service_zip TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'archived')),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  terms_and_conditions TEXT,
  created_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_quotes_company_id ON quotes(company_id);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_deleted_at ON quotes(deleted_at);

-- Quote Line Items
CREATE TABLE public.quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT DEFAULT 'service' CHECK (item_type IN ('service', 'material', 'labor', 'other')),
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_quote_line_items_company_id ON quote_line_items(company_id);
CREATE INDEX idx_quote_line_items_quote_id ON quote_line_items(quote_id);

-- =====================================================
-- PROJECTS
-- =====================================================

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  project_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  quote_id UUID REFERENCES quotes(id),
  title TEXT NOT NULL,
  description TEXT,
  service_address TEXT,
  service_city TEXT,
  service_state TEXT,
  service_zip TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  contract_amount DECIMAL(10, 2),
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  assigned_crew_lead UUID REFERENCES users(id),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_project_number ON projects(project_number);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_assigned_crew_lead ON projects(assigned_crew_lead);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

-- Project Tasks
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_project_tasks_company_id ON project_tasks(company_id);
CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);
CREATE INDEX idx_project_tasks_deleted_at ON project_tasks(deleted_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see their own company
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Companies: Only super admins can update companies
CREATE POLICY "Super admins can update companies"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users: Users can only see users in their company
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users: Admins can manage users in their company
CREATE POLICY "Admins can manage users in their company"
  ON users FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Customers: Users can only access their company's customers
CREATE POLICY "Users can access their company's customers"
  ON customers FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Leads: Users can only access their company's leads
CREATE POLICY "Users can access their company's leads"
  ON leads FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Activities: Users can only access their company's activities
CREATE POLICY "Users can access their company's activities"
  ON activities FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Quotes: Users can only access their company's quotes
CREATE POLICY "Users can access their company's quotes"
  ON quotes FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Quote Line Items: Users can only access their company's quote line items
CREATE POLICY "Users can access their company's quote line items"
  ON quote_line_items FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Projects: Users can only access their company's projects
CREATE POLICY "Users can access their company's projects"
  ON projects FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Project Tasks: Users can only access their company's project tasks
CREATE POLICY "Users can access their company's project tasks"
  ON project_tasks FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_line_items_updated_at BEFORE UPDATE ON quote_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_prefix TEXT;
  counter INTEGER;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the highest number for current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO counter
  FROM quotes
  WHERE quote_number LIKE 'Q-' || year_prefix || '-%';
  
  new_number := 'Q-' || year_prefix || '-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique project number
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_prefix TEXT;
  counter INTEGER;
BEGIN
  year_prefix := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the highest number for current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO counter
  FROM projects
  WHERE project_number LIKE 'P-' || year_prefix || '-%';
  
  new_number := 'P-' || year_prefix || '-' || LPAD(counter::TEXT, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate quote number if not provided
CREATE OR REPLACE FUNCTION auto_generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_quote_number BEFORE INSERT ON quotes FOR EACH ROW EXECUTE FUNCTION auto_generate_quote_number();

-- Trigger to auto-generate project number if not provided
CREATE OR REPLACE FUNCTION auto_generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := generate_project_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_project_number BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION auto_generate_project_number();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE companies IS 'Multi-tenant company/organization table - each company is a separate tenant';
COMMENT ON TABLE users IS 'Application users - linked to auth.users and scoped to a company';
COMMENT ON TABLE customers IS 'Customer database - company-scoped';
COMMENT ON TABLE leads IS 'Sales leads - company-scoped';
COMMENT ON TABLE activities IS 'Universal activity log for all entities';
COMMENT ON TABLE quotes IS 'Quote/estimate management';
COMMENT ON TABLE quote_line_items IS 'Line items for quotes';
COMMENT ON TABLE projects IS 'Project management for active jobs';
COMMENT ON TABLE project_tasks IS 'Tasks within projects';
