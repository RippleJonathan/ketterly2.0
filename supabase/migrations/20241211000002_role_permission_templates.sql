-- =====================================================
-- ROLE PERMISSION TEMPLATES MIGRATION
-- =====================================================
-- This migration creates a database-backed role permissions system
-- that allows companies to customize default permissions for each role.
-- Each company gets their own set of role templates.

-- =====================================================
-- CREATE ROLE_PERMISSION_TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  
  -- All 44 permission columns matching user_permissions table
  -- Leads & Projects (5)
  can_view_leads BOOLEAN NOT NULL DEFAULT false,
  can_create_leads BOOLEAN NOT NULL DEFAULT false,
  can_edit_leads BOOLEAN NOT NULL DEFAULT false,
  can_delete_leads BOOLEAN NOT NULL DEFAULT false,
  can_view_all_leads BOOLEAN NOT NULL DEFAULT false,
  
  -- Quotes (6)
  can_view_quotes BOOLEAN NOT NULL DEFAULT false,
  can_create_quotes BOOLEAN NOT NULL DEFAULT false,
  can_edit_quotes BOOLEAN NOT NULL DEFAULT false,
  can_delete_quotes BOOLEAN NOT NULL DEFAULT false,
  can_approve_quotes BOOLEAN NOT NULL DEFAULT false,
  can_send_quotes BOOLEAN NOT NULL DEFAULT false,
  
  -- Invoices & Payments (6)
  can_view_invoices BOOLEAN NOT NULL DEFAULT false,
  can_create_invoices BOOLEAN NOT NULL DEFAULT false,
  can_edit_invoices BOOLEAN NOT NULL DEFAULT false,
  can_delete_invoices BOOLEAN NOT NULL DEFAULT false,
  can_record_payments BOOLEAN NOT NULL DEFAULT false,
  can_void_payments BOOLEAN NOT NULL DEFAULT false,
  
  -- Material Orders (5)
  can_view_material_orders BOOLEAN NOT NULL DEFAULT false,
  can_create_material_orders BOOLEAN NOT NULL DEFAULT false,
  can_edit_material_orders BOOLEAN NOT NULL DEFAULT false,
  can_delete_material_orders BOOLEAN NOT NULL DEFAULT false,
  can_mark_orders_paid BOOLEAN NOT NULL DEFAULT false,
  
  -- Work Orders & Crew (5)
  can_view_work_orders BOOLEAN NOT NULL DEFAULT false,
  can_create_work_orders BOOLEAN NOT NULL DEFAULT false,
  can_edit_work_orders BOOLEAN NOT NULL DEFAULT false,
  can_delete_work_orders BOOLEAN NOT NULL DEFAULT false,
  can_assign_crew BOOLEAN NOT NULL DEFAULT false,
  
  -- Customers (4)
  can_view_customers BOOLEAN NOT NULL DEFAULT false,
  can_create_customers BOOLEAN NOT NULL DEFAULT false,
  can_edit_customers BOOLEAN NOT NULL DEFAULT false,
  can_delete_customers BOOLEAN NOT NULL DEFAULT false,
  
  -- Financials & Reports (4)
  can_view_financials BOOLEAN NOT NULL DEFAULT false,
  can_view_profit_margins BOOLEAN NOT NULL DEFAULT false,
  can_view_commission_reports BOOLEAN NOT NULL DEFAULT false,
  can_export_reports BOOLEAN NOT NULL DEFAULT false,
  
  -- Users & Settings (6)
  can_view_users BOOLEAN NOT NULL DEFAULT false,
  can_create_users BOOLEAN NOT NULL DEFAULT false,
  can_edit_users BOOLEAN NOT NULL DEFAULT false,
  can_delete_users BOOLEAN NOT NULL DEFAULT false,
  can_manage_permissions BOOLEAN NOT NULL DEFAULT false,
  can_edit_company_settings BOOLEAN NOT NULL DEFAULT false,
  
  -- Production (3)
  can_upload_photos BOOLEAN NOT NULL DEFAULT false,
  can_update_project_status BOOLEAN NOT NULL DEFAULT false,
  can_view_project_timeline BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Unique constraint: one template name per company
  CONSTRAINT unique_company_template_name UNIQUE (company_id, template_name)
);

-- Add indexes for performance
CREATE INDEX idx_role_permission_templates_company_id ON role_permission_templates(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_role_permission_templates_role ON role_permission_templates(role) WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON TABLE role_permission_templates IS 'Database-backed role permission templates that allow companies to customize default permissions for each role';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE role_permission_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their company's role templates
CREATE POLICY "Users can only access their company's role templates"
  ON role_permission_templates
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
      AND deleted_at IS NULL
    )
  );

-- =====================================================
-- TRIGGER: UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_role_permission_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_role_permission_templates_updated_at
  BEFORE UPDATE ON role_permission_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permission_templates_updated_at();

-- =====================================================
-- SEED DEFAULT ROLE TEMPLATES
-- =====================================================
-- This function seeds role permission templates for a company
-- based on the DEFAULT_ROLE_PERMISSIONS in lib/types/users.ts

CREATE OR REPLACE FUNCTION seed_role_permission_templates(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Admin Template (44/44 permissions - Full Access)
  INSERT INTO role_permission_templates (
    company_id, template_name, description, is_system_default,
    can_view_leads, can_create_leads, can_edit_leads, can_delete_leads, can_view_all_leads,
    can_view_quotes, can_create_quotes, can_edit_quotes, can_delete_quotes, can_approve_quotes, can_send_quotes,
    can_view_invoices, can_create_invoices, can_edit_invoices, can_delete_invoices, can_record_payments, can_void_payments,
    can_view_material_orders, can_create_material_orders, can_edit_material_orders, can_delete_material_orders, can_mark_orders_paid,
    can_view_work_orders, can_create_work_orders, can_edit_work_orders, can_delete_work_orders, can_assign_crew,
    can_view_customers, can_create_customers, can_edit_customers, can_delete_customers,
    can_view_financials, can_view_profit_margins, can_view_commission_reports, can_export_reports,
    can_view_users, can_create_users, can_edit_users, can_delete_users, can_manage_permissions, can_edit_company_settings,
    can_upload_photos, can_update_project_status, can_view_project_timeline
  ) VALUES (
    p_company_id, 'Admin', 'Full access to all features, reports, and settings', true,
    true, true, true, true, true,
    true, true, true, true, true, true,
    true, true, true, true, true, true,
    true, true, true, true, true,
    true, true, true, true, true,
    true, true, true, true,
    true, true, true, true,
    true, true, true, true, true, true,
    true, true, true
  ) ON CONFLICT (company_id, template_name) DO NOTHING;

  -- Office Manager Template (30/44 permissions)
  INSERT INTO role_permission_templates (
    company_id, template_name, description, is_system_default,
    can_view_leads, can_create_leads, can_edit_leads, can_delete_leads, can_view_all_leads,
    can_view_quotes, can_create_quotes, can_edit_quotes, can_delete_quotes, can_approve_quotes, can_send_quotes,
    can_view_invoices, can_create_invoices, can_edit_invoices, can_delete_invoices, can_record_payments, can_void_payments,
    can_view_material_orders, can_create_material_orders, can_edit_material_orders, can_delete_material_orders, can_mark_orders_paid,
    can_view_work_orders, can_create_work_orders, can_edit_work_orders, can_delete_work_orders, can_assign_crew,
    can_view_customers, can_create_customers, can_edit_customers, can_delete_customers,
    can_view_financials, can_view_profit_margins, can_view_commission_reports, can_export_reports,
    can_view_users, can_create_users, can_edit_users, can_delete_users, can_manage_permissions, can_edit_company_settings,
    can_upload_photos, can_update_project_status, can_view_project_timeline
  ) VALUES (
    p_company_id, 'Office Manager', 'Manage quotes, invoices, customers, and scheduling', true,
    true, true, true, false, true,
    true, true, true, false, false, true,
    true, true, true, false, true, false,
    true, true, true, false, false,
    true, true, true, false, true,
    true, true, true, false,
    false, false, false, true,
    true, false, false, false, false, false,
    false, true, true
  ) ON CONFLICT (company_id, template_name) DO NOTHING;

  -- Sales Manager Template (29/44 permissions)
  INSERT INTO role_permission_templates (
    company_id, template_name, description, is_system_default,
    can_view_leads, can_create_leads, can_edit_leads, can_delete_leads, can_view_all_leads,
    can_view_quotes, can_create_quotes, can_edit_quotes, can_delete_quotes, can_approve_quotes, can_send_quotes,
    can_view_invoices, can_create_invoices, can_edit_invoices, can_delete_invoices, can_record_payments, can_void_payments,
    can_view_material_orders, can_create_material_orders, can_edit_material_orders, can_delete_material_orders, can_mark_orders_paid,
    can_view_work_orders, can_create_work_orders, can_edit_work_orders, can_delete_work_orders, can_assign_crew,
    can_view_customers, can_create_customers, can_edit_customers, can_delete_customers,
    can_view_financials, can_view_profit_margins, can_view_commission_reports, can_export_reports,
    can_view_users, can_create_users, can_edit_users, can_delete_users, can_manage_permissions, can_edit_company_settings,
    can_upload_photos, can_update_project_status, can_view_project_timeline
  ) VALUES (
    p_company_id, 'Sales Manager', 'Oversee sales team, approve quotes, view reports', true,
    true, true, true, true, true,
    true, true, true, true, true, true,
    true, false, false, false, false, false,
    true, false, false, false, false,
    true, false, false, false, false,
    true, true, true, false,
    true, true, true, true,
    true, false, false, false, false, false,
    false, false, true
  ) ON CONFLICT (company_id, template_name) DO NOTHING;

  -- Sales Representative Template (21/44 permissions)
  INSERT INTO role_permission_templates (
    company_id, template_name, description, is_system_default,
    can_view_leads, can_create_leads, can_edit_leads, can_delete_leads, can_view_all_leads,
    can_view_quotes, can_create_quotes, can_edit_quotes, can_delete_quotes, can_approve_quotes, can_send_quotes,
    can_view_invoices, can_create_invoices, can_edit_invoices, can_delete_invoices, can_record_payments, can_void_payments,
    can_view_material_orders, can_create_material_orders, can_edit_material_orders, can_delete_material_orders, can_mark_orders_paid,
    can_view_work_orders, can_create_work_orders, can_edit_work_orders, can_delete_work_orders, can_assign_crew,
    can_view_customers, can_create_customers, can_edit_customers, can_delete_customers,
    can_view_financials, can_view_profit_margins, can_view_commission_reports, can_export_reports,
    can_view_users, can_create_users, can_edit_users, can_delete_users, can_manage_permissions, can_edit_company_settings,
    can_upload_photos, can_update_project_status, can_view_project_timeline
  ) VALUES (
    p_company_id, 'Sales Representative', 'Create leads, generate quotes, manage customer relationships', true,
    true, true, true, false, false,
    true, true, true, false, false, true,
    true, false, false, false, false, false,
    false, false, false, false, false,
    false, false, false, false, false,
    true, true, true, false,
    false, false, true, true,
    true, false, false, false, false, false,
    false, false, true
  ) ON CONFLICT (company_id, template_name) DO NOTHING;

  -- Production Manager Template (10/44 permissions)
  INSERT INTO role_permission_templates (
    company_id, template_name, description, is_system_default,
    can_view_leads, can_create_leads, can_edit_leads, can_delete_leads, can_view_all_leads,
    can_view_quotes, can_create_quotes, can_edit_quotes, can_delete_quotes, can_approve_quotes, can_send_quotes,
    can_view_invoices, can_create_invoices, can_edit_invoices, can_delete_invoices, can_record_payments, can_void_payments,
    can_view_material_orders, can_create_material_orders, can_edit_material_orders, can_delete_material_orders, can_mark_orders_paid,
    can_view_work_orders, can_create_work_orders, can_edit_work_orders, can_delete_work_orders, can_assign_crew,
    can_view_customers, can_create_customers, can_edit_customers, can_delete_customers,
    can_view_financials, can_view_profit_margins, can_view_commission_reports, can_export_reports,
    can_view_users, can_create_users, can_edit_users, can_delete_users, can_manage_permissions, can_edit_company_settings,
    can_upload_photos, can_update_project_status, can_view_project_timeline
  ) VALUES (
    p_company_id, 'Production Manager', 'Update work orders, upload photos, track project progress', true,
    false, false, false, false, false,
    false, false, false, false, false, false,
    false, false, false, false, false, false,
    true, false, false, false, false,
    true, false, true, false, false,
    true, false, false, false,
    false, false, false, false,
    true, false, false, false, false, false,
    true, true, true
  ) ON CONFLICT (company_id, template_name) DO NOTHING;

  -- Marketing Coordinator Template (15/44 permissions)
  INSERT INTO role_permission_templates (
    company_id, template_name, description, is_system_default,
    can_view_leads, can_create_leads, can_edit_leads, can_delete_leads, can_view_all_leads,
    can_view_quotes, can_create_quotes, can_edit_quotes, can_delete_quotes, can_approve_quotes, can_send_quotes,
    can_view_invoices, can_create_invoices, can_edit_invoices, can_delete_invoices, can_record_payments, can_void_payments,
    can_view_material_orders, can_create_material_orders, can_edit_material_orders, can_delete_material_orders, can_mark_orders_paid,
    can_view_work_orders, can_create_work_orders, can_edit_work_orders, can_delete_work_orders, can_assign_crew,
    can_view_customers, can_create_customers, can_edit_customers, can_delete_customers,
    can_view_financials, can_view_profit_margins, can_view_commission_reports, can_export_reports,
    can_view_users, can_create_users, can_edit_users, can_delete_users, can_manage_permissions, can_edit_company_settings,
    can_upload_photos, can_update_project_status, can_view_project_timeline
  ) VALUES (
    p_company_id, 'Marketing Coordinator', 'Manage leads, view analytics, export reports', true,
    true, true, true, false, true,
    true, false, false, false, false, false,
    false, false, false, false, false, false,
    false, false, false, false, false,
    false, false, false, false, false,
    true, true, false, false,
    true, false, false, true,
    true, false, false, false, false, false,
    false, false, false
  ) ON CONFLICT (company_id, template_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED EXISTING COMPANIES
-- =====================================================
-- Seed role templates for all existing companies

DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies WHERE deleted_at IS NULL
  LOOP
    PERFORM seed_role_permission_templates(company_record.id);
  END LOOP;
END $$;

-- =====================================================
-- TRIGGER: AUTO-SEED NEW COMPANIES
-- =====================================================
-- Automatically seed role templates when a new company is created

CREATE OR REPLACE FUNCTION trigger_seed_role_templates()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_role_permission_templates(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_seed_role_templates
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_role_templates();

-- =====================================================
-- HELPER FUNCTION: GET ROLE TEMPLATE BY NAME
-- =====================================================
-- Get role template permissions for a specific company and template name

CREATE OR REPLACE FUNCTION get_role_template_by_name(
  p_company_id UUID,
  p_template_name TEXT
)
RETURNS TABLE (
  can_view_leads BOOLEAN, can_create_leads BOOLEAN, can_edit_leads BOOLEAN, can_delete_leads BOOLEAN, can_view_all_leads BOOLEAN,
  can_view_quotes BOOLEAN, can_create_quotes BOOLEAN, can_edit_quotes BOOLEAN, can_delete_quotes BOOLEAN, can_approve_quotes BOOLEAN, can_send_quotes BOOLEAN,
  can_view_invoices BOOLEAN, can_create_invoices BOOLEAN, can_edit_invoices BOOLEAN, can_delete_invoices BOOLEAN, can_record_payments BOOLEAN, can_void_payments BOOLEAN,
  can_view_material_orders BOOLEAN, can_create_material_orders BOOLEAN, can_edit_material_orders BOOLEAN, can_delete_material_orders BOOLEAN, can_mark_orders_paid BOOLEAN,
  can_view_work_orders BOOLEAN, can_create_work_orders BOOLEAN, can_edit_work_orders BOOLEAN, can_delete_work_orders BOOLEAN, can_assign_crew BOOLEAN,
  can_view_customers BOOLEAN, can_create_customers BOOLEAN, can_edit_customers BOOLEAN, can_delete_customers BOOLEAN,
  can_view_financials BOOLEAN, can_view_profit_margins BOOLEAN, can_view_commission_reports BOOLEAN, can_export_reports BOOLEAN,
  can_view_users BOOLEAN, can_create_users BOOLEAN, can_edit_users BOOLEAN, can_delete_users BOOLEAN, can_manage_permissions BOOLEAN, can_edit_company_settings BOOLEAN,
  can_upload_photos BOOLEAN, can_update_project_status BOOLEAN, can_view_project_timeline BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.can_view_leads, t.can_create_leads, t.can_edit_leads, t.can_delete_leads, t.can_view_all_leads,
    t.can_view_quotes, t.can_create_quotes, t.can_edit_quotes, t.can_delete_quotes, t.can_approve_quotes, t.can_send_quotes,
    t.can_view_invoices, t.can_create_invoices, t.can_edit_invoices, t.can_delete_invoices, t.can_record_payments, t.can_void_payments,
    t.can_view_material_orders, t.can_create_material_orders, t.can_edit_material_orders, t.can_delete_material_orders, t.can_mark_orders_paid,
    t.can_view_work_orders, t.can_create_work_orders, t.can_edit_work_orders, t.can_delete_work_orders, t.can_assign_crew,
    t.can_view_customers, t.can_create_customers, t.can_edit_customers, t.can_delete_customers,
    t.can_view_financials, t.can_view_profit_margins, t.can_view_commission_reports, t.can_export_reports,
    t.can_view_users, t.can_create_users, t.can_edit_users, t.can_delete_users, t.can_manage_permissions, t.can_edit_company_settings,
    t.can_upload_photos, t.can_update_project_status, t.can_view_project_timeline
  FROM role_permission_templates t
  WHERE t.company_id = p_company_id
    AND t.template_name = p_template_name
    AND t.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETE
-- =====================================================
-- Role permission templates system is now ready!
-- Companies can now customize permissions for each role through the UI.
