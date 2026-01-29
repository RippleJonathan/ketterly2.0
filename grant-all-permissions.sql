-- =====================================================
-- GRANT ALL PERMISSIONS - Correct column names
-- =====================================================

-- Jonathan Ketterman: 6375ffe0-514e-41fc-b8cb-57699dcc9b4e
-- Tyler Griffiths: 7ae76e21-a3f2-4ff0-9267-9d80e2f1da90

-- Create permissions records if they don't exist
INSERT INTO user_permissions (user_id)
VALUES 
  ('6375ffe0-514e-41fc-b8cb-57699dcc9b4e'),
  ('7ae76e21-a3f2-4ff0-9267-9d80e2f1da90')
ON CONFLICT (user_id) DO NOTHING;

-- Grant ALL permissions (set every column to true)
UPDATE user_permissions
SET
  can_view_leads = true,
  can_create_leads = true,
  can_edit_leads = true,
  can_delete_leads = true,
  can_view_lead_details = true,
  can_view_lead_checklist = true,
  can_view_lead_measurements = true,
  can_view_lead_estimates = true,
  can_view_lead_orders = true,
  can_view_lead_photos = true,
  can_view_lead_notes = true,
  can_view_lead_documents = true,
  can_view_lead_payments = true,
  can_view_lead_financials = true,
  can_view_lead_commissions = true,
  can_view_users = true,
  can_create_users = true,
  can_edit_users = true,
  can_delete_users = true,
  can_manage_permissions = true,
  can_view_reports = true,
  can_view_settings = true,
  can_edit_settings = true,
  can_view_company_settings = true,
  can_edit_company_settings = true,
  can_manage_locations = true,
  can_manage_teams = true,
  can_view_all_leads = true,
  can_export_data = true,
  can_import_data = true,
  can_view_audit_logs = true,
  can_manage_integrations = true,
  can_view_analytics = true,
  can_manage_workflows = true,
  can_approve_quotes = true,
  can_send_quotes = true,
  can_create_invoices = true,
  can_void_invoices = true,
  can_process_payments = true,
  can_manage_commissions = true,
  can_view_door_knocking = true,
  can_manage_marketing = true
WHERE user_id IN (
  '6375ffe0-514e-41fc-b8cb-57699dcc9b4e',
  '7ae76e21-a3f2-4ff0-9267-9d80e2f1da90'
);

-- Verify it worked
SELECT 
  u.full_name,
  u.email,
  'All permissions granted!' as status
FROM user_permissions p
JOIN users u ON u.id = p.user_id
WHERE p.user_id IN (
  '6375ffe0-514e-41fc-b8cb-57699dcc9b4e',
  '7ae76e21-a3f2-4ff0-9267-9d80e2f1da90'
);
