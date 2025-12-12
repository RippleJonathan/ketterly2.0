-- Migration: Convert role_templates to company_roles for custom role system
-- This allows each company to define their own roles with custom permissions

-- =====================================================
-- COMPANY ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Role details
  role_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Permissions
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  is_system_role BOOLEAN NOT NULL DEFAULT false, -- System roles can't be deleted
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_count INTEGER NOT NULL DEFAULT 0, -- Cached count of users with this role
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_company_role_name UNIQUE (company_id, role_name),
  CONSTRAINT valid_role_name CHECK (role_name ~ '^[a-z][a-z0-9_]*$') -- snake_case only
);

-- Indexes
CREATE INDEX idx_company_roles_company_id ON company_roles(company_id);
CREATE INDEX idx_company_roles_is_active ON company_roles(is_active);
CREATE INDEX idx_company_roles_deleted_at ON company_roles(deleted_at);

-- RLS Policies
ALTER TABLE company_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company roles"
  ON company_roles
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can manage company roles"
  ON company_roles
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- UPDATE USERS TABLE
-- =====================================================

-- Change role column to reference company_roles
-- First, add new column
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role_id UUID REFERENCES company_roles(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_company_role_id ON users(company_role_id);

-- =====================================================
-- FUNCTION: Create Default Roles for Company
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_company_roles(p_company_id UUID, p_created_by UUID)
RETURNS VOID AS $$
BEGIN
  -- Admin Role (protected - cannot be deleted or renamed)
  INSERT INTO company_roles (company_id, role_name, display_name, description, is_system_role, created_by, permissions)
  VALUES (
    p_company_id,
    'admin',
    'Admin',
    'Company owner/administrator with full access to all features',
    true,
    p_created_by,
    jsonb_build_object(
      'can_view_leads', true,
      'can_create_leads', true,
      'can_edit_leads', true,
      'can_delete_leads', true,
      'can_view_all_leads', true,
      'can_view_quotes', true,
      'can_create_quotes', true,
      'can_edit_quotes', true,
      'can_delete_quotes', true,
      'can_approve_quotes', true,
      'can_send_quotes', true,
      'can_view_invoices', true,
      'can_create_invoices', true,
      'can_edit_invoices', true,
      'can_delete_invoices', true,
      'can_record_payments', true,
      'can_void_payments', true,
      'can_view_material_orders', true,
      'can_create_material_orders', true,
      'can_edit_material_orders', true,
      'can_delete_material_orders', true,
      'can_mark_orders_paid', true,
      'can_view_work_orders', true,
      'can_create_work_orders', true,
      'can_edit_work_orders', true,
      'can_delete_work_orders', true,
      'can_assign_crew', true,
      'can_view_customers', true,
      'can_create_customers', true,
      'can_edit_customers', true,
      'can_delete_customers', true,
      'can_view_financials', true,
      'can_view_profit_margins', true,
      'can_view_commission_reports', true,
      'can_export_reports', true,
      'can_view_users', true,
      'can_create_users', true,
      'can_edit_users', true,
      'can_delete_users', true,
      'can_manage_permissions', true,
      'can_edit_company_settings', true,
      'can_upload_photos', true,
      'can_update_project_status', true,
      'can_view_project_timeline', true
    )
  );

  -- Office Staff Role
  INSERT INTO company_roles (company_id, role_name, display_name, description, is_system_role, created_by, permissions)
  VALUES (
    p_company_id,
    'office',
    'Office Staff',
    'Office staff managing quotes, invoices, customers, and scheduling',
    false,
    p_created_by,
    jsonb_build_object(
      'can_view_leads', true,
      'can_create_leads', true,
      'can_edit_leads', true,
      'can_delete_leads', false,
      'can_view_all_leads', true,
      'can_view_quotes', true,
      'can_create_quotes', true,
      'can_edit_quotes', true,
      'can_delete_quotes', false,
      'can_approve_quotes', false,
      'can_send_quotes', true,
      'can_view_invoices', true,
      'can_create_invoices', true,
      'can_edit_invoices', true,
      'can_delete_invoices', false,
      'can_record_payments', true,
      'can_void_payments', false,
      'can_view_material_orders', true,
      'can_create_material_orders', true,
      'can_edit_material_orders', true,
      'can_delete_material_orders', false,
      'can_mark_orders_paid', false,
      'can_view_work_orders', true,
      'can_create_work_orders', true,
      'can_edit_work_orders', true,
      'can_delete_work_orders', false,
      'can_assign_crew', true,
      'can_view_customers', true,
      'can_create_customers', true,
      'can_edit_customers', true,
      'can_delete_customers', false,
      'can_view_financials', false,
      'can_view_profit_margins', false,
      'can_view_commission_reports', false,
      'can_export_reports', true,
      'can_view_users', true,
      'can_create_users', false,
      'can_edit_users', false,
      'can_delete_users', false,
      'can_manage_permissions', false,
      'can_edit_company_settings', false,
      'can_upload_photos', false,
      'can_update_project_status', true,
      'can_view_project_timeline', true
    )
  );

  -- Sales Manager Role
  INSERT INTO company_roles (company_id, role_name, display_name, description, is_system_role, created_by, permissions)
  VALUES (
    p_company_id,
    'sales_manager',
    'Sales Manager',
    'Sales team lead managing sales reps and overseeing all leads',
    false,
    p_created_by,
    jsonb_build_object(
      'can_view_leads', true,
      'can_create_leads', true,
      'can_edit_leads', true,
      'can_delete_leads', true,
      'can_view_all_leads', true,
      'can_view_quotes', true,
      'can_create_quotes', true,
      'can_edit_quotes', true,
      'can_delete_quotes', true,
      'can_approve_quotes', true,
      'can_send_quotes', true,
      'can_view_invoices', true,
      'can_create_invoices', false,
      'can_edit_invoices', false,
      'can_delete_invoices', false,
      'can_record_payments', false,
      'can_void_payments', false,
      'can_view_material_orders', true,
      'can_create_material_orders', false,
      'can_edit_material_orders', false,
      'can_delete_material_orders', false,
      'can_mark_orders_paid', false,
      'can_view_work_orders', true,
      'can_create_work_orders', false,
      'can_edit_work_orders', false,
      'can_delete_work_orders', false,
      'can_assign_crew', false,
      'can_view_customers', true,
      'can_create_customers', true,
      'can_edit_customers', true,
      'can_delete_customers', false,
      'can_view_financials', true,
      'can_view_profit_margins', true,
      'can_view_commission_reports', true,
      'can_export_reports', true,
      'can_view_users', true,
      'can_create_users', false,
      'can_edit_users', false,
      'can_delete_users', false,
      'can_manage_permissions', false,
      'can_edit_company_settings', false,
      'can_upload_photos', false,
      'can_update_project_status', false,
      'can_view_project_timeline', true
    )
  );

  -- Sales Representative Role
  INSERT INTO company_roles (company_id, role_name, display_name, description, is_system_role, created_by, permissions)
  VALUES (
    p_company_id,
    'sales',
    'Sales Rep',
    'Sales representative managing assigned leads and creating quotes',
    false,
    p_created_by,
    jsonb_build_object(
      'can_view_leads', true,
      'can_create_leads', true,
      'can_edit_leads', true,
      'can_delete_leads', false,
      'can_view_all_leads', false,
      'can_view_quotes', true,
      'can_create_quotes', true,
      'can_edit_quotes', true,
      'can_delete_quotes', false,
      'can_approve_quotes', false,
      'can_send_quotes', true,
      'can_view_invoices', true,
      'can_create_invoices', false,
      'can_edit_invoices', false,
      'can_delete_invoices', false,
      'can_record_payments', false,
      'can_void_payments', false,
      'can_view_material_orders', false,
      'can_create_material_orders', false,
      'can_edit_material_orders', false,
      'can_delete_material_orders', false,
      'can_mark_orders_paid', false,
      'can_view_work_orders', false,
      'can_create_work_orders', false,
      'can_edit_work_orders', false,
      'can_delete_work_orders', false,
      'can_assign_crew', false,
      'can_view_customers', true,
      'can_create_customers', true,
      'can_edit_customers', true,
      'can_delete_customers', false,
      'can_view_financials', false,
      'can_view_profit_margins', false,
      'can_view_commission_reports', true,
      'can_export_reports', true,
      'can_view_users', true,
      'can_create_users', false,
      'can_edit_users', false,
      'can_delete_users', false,
      'can_manage_permissions', false,
      'can_edit_company_settings', false,
      'can_upload_photos', false,
      'can_update_project_status', false,
      'can_view_project_timeline', true
    )
  );

  -- Production/Crew Role
  INSERT INTO company_roles (company_id, role_name, display_name, description, is_system_role, created_by, permissions)
  VALUES (
    p_company_id,
    'production',
    'Production/Crew',
    'Production crew members updating work orders and project status',
    false,
    p_created_by,
    jsonb_build_object(
      'can_view_leads', false,
      'can_create_leads', false,
      'can_edit_leads', false,
      'can_delete_leads', false,
      'can_view_all_leads', false,
      'can_view_quotes', false,
      'can_create_quotes', false,
      'can_edit_quotes', false,
      'can_delete_quotes', false,
      'can_approve_quotes', false,
      'can_send_quotes', false,
      'can_view_invoices', false,
      'can_create_invoices', false,
      'can_edit_invoices', false,
      'can_delete_invoices', false,
      'can_record_payments', false,
      'can_void_payments', false,
      'can_view_material_orders', true,
      'can_create_material_orders', false,
      'can_edit_material_orders', false,
      'can_delete_material_orders', false,
      'can_mark_orders_paid', false,
      'can_view_work_orders', true,
      'can_create_work_orders', false,
      'can_edit_work_orders', true,
      'can_delete_work_orders', false,
      'can_assign_crew', false,
      'can_view_customers', true,
      'can_create_customers', false,
      'can_edit_customers', false,
      'can_delete_customers', false,
      'can_view_financials', false,
      'can_view_profit_margins', false,
      'can_view_commission_reports', false,
      'can_export_reports', false,
      'can_view_users', true,
      'can_create_users', false,
      'can_edit_users', false,
      'can_delete_users', false,
      'can_manage_permissions', false,
      'can_edit_company_settings', false,
      'can_upload_photos', true,
      'can_update_project_status', true,
      'can_view_project_timeline', true
    )
  );

  -- Marketing Role
  INSERT INTO company_roles (company_id, role_name, display_name, description, is_system_role, created_by, permissions)
  VALUES (
    p_company_id,
    'marketing',
    'Marketing',
    'Marketing team creating campaigns and analyzing lead performance',
    false,
    p_created_by,
    jsonb_build_object(
      'can_view_leads', true,
      'can_create_leads', true,
      'can_edit_leads', true,
      'can_delete_leads', false,
      'can_view_all_leads', true,
      'can_view_quotes', true,
      'can_create_quotes', false,
      'can_edit_quotes', false,
      'can_delete_quotes', false,
      'can_approve_quotes', false,
      'can_send_quotes', false,
      'can_view_invoices', false,
      'can_create_invoices', false,
      'can_edit_invoices', false,
      'can_delete_invoices', false,
      'can_record_payments', false,
      'can_void_payments', false,
      'can_view_material_orders', false,
      'can_create_material_orders', false,
      'can_edit_material_orders', false,
      'can_delete_material_orders', false,
      'can_mark_orders_paid', false,
      'can_view_work_orders', false,
      'can_create_work_orders', false,
      'can_edit_work_orders', false,
      'can_delete_work_orders', false,
      'can_assign_crew', false,
      'can_view_customers', true,
      'can_create_customers', true,
      'can_edit_customers', false,
      'can_delete_customers', false,
      'can_view_financials', true,
      'can_view_profit_margins', false,
      'can_view_commission_reports', false,
      'can_export_reports', true,
      'can_view_users', true,
      'can_create_users', false,
      'can_edit_users', false,
      'can_delete_users', false,
      'can_manage_permissions', false,
      'can_edit_company_settings', false,
      'can_upload_photos', false,
      'can_update_project_status', false,
      'can_view_project_timeline', false
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update user_count on company_roles
-- =====================================================

CREATE OR REPLACE FUNCTION update_role_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE company_roles 
    SET user_count = user_count + 1 
    WHERE id = NEW.company_role_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.company_role_id != NEW.company_role_id THEN
    UPDATE company_roles 
    SET user_count = user_count - 1 
    WHERE id = OLD.company_role_id;
    UPDATE company_roles 
    SET user_count = user_count + 1 
    WHERE id = NEW.company_role_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE company_roles 
    SET user_count = user_count - 1 
    WHERE id = OLD.company_role_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_role_user_count
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION update_role_user_count();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE company_roles IS 'Custom roles defined by each company with specific permissions';
COMMENT ON COLUMN company_roles.role_name IS 'Internal snake_case identifier (e.g., sales_manager)';
COMMENT ON COLUMN company_roles.display_name IS 'Human-readable name shown in UI (e.g., Sales Manager)';
COMMENT ON COLUMN company_roles.is_system_role IS 'System roles cannot be deleted, only their permissions can be edited';
COMMENT ON COLUMN company_roles.user_count IS 'Cached count of active users assigned to this role';
