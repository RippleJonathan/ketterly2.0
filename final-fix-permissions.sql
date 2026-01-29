-- =====================================================
-- GRANT ALL PERMISSIONS - Using ACTUAL column names
-- =====================================================

-- Jonathan: 6375ffe0-514e-41fc-b8cb-57699dcc9b4e (already has permissions)
-- Tyler: 7ae76e21-a3f2-4ff0-9267-9d80e2f1da90

-- Update Tyler's permissions to match Jonathan's (all true)
UPDATE user_permissions
SET
  can_view_leads = true,
  can_create_leads = true,
  can_edit_leads = true,
  can_delete_leads = true,
  can_view_all_leads = true,
  can_view_quotes = true,
  can_create_quotes = true,
  can_edit_quotes = true,
  can_delete_quotes = true,
  can_approve_quotes = true,
  can_send_quotes = true,
  can_view_invoices = true,
  can_create_invoices = true,
  can_edit_invoices = true,
  can_delete_invoices = true,
  can_record_payments = true,
  can_void_payments = true,
  can_view_material_orders = true,
  can_create_material_orders = true,
  can_edit_material_orders = true,
  can_delete_material_orders = true,
  can_mark_orders_paid = true,
  can_view_work_orders = true,
  can_create_work_orders = true,
  can_edit_work_orders = true,
  can_delete_work_orders = true,
  can_assign_crew = true,
  can_view_customers = true,
  can_create_customers = true,
  can_edit_customers = true,
  can_delete_customers = true,
  can_view_financials = true,
  can_view_profit_margins = true,
  can_view_commission_reports = true,
  can_export_reports = true,
  can_view_users = true,
  can_create_users = true,
  can_edit_users = true,
  can_delete_users = true,
  can_manage_permissions = true,
  can_edit_company_settings = true,
  can_upload_photos = true,
  can_update_project_status = true,
  can_view_project_timeline = true,
  can_view_own_commissions = true,
  can_view_all_commissions = true,
  can_create_commissions = true,
  can_edit_commissions = true,
  can_delete_commissions = true,
  can_mark_commissions_paid = true,
  can_view_calendar = true,
  can_create_consultations = true,
  can_create_production_events = true,
  can_edit_all_events = true,
  can_manage_recurring_events = true,
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
  can_manage_commissions = true,
  can_approve_commissions = true,
  can_assign_sales_rep = true,
  can_assign_sales_manager = true,
  can_assign_marketing_rep = true,
  can_assign_production_manager = true
WHERE user_id = '7ae76e21-a3f2-4ff0-9267-9d80e2f1da90';

-- Verify both users have full permissions
SELECT 
  u.full_name,
  u.email,
  p.can_view_lead_details,
  p.can_view_leads,
  'Ready to go!' as status
FROM user_permissions p
JOIN users u ON u.id = p.user_id
WHERE p.user_id IN (
  '6375ffe0-514e-41fc-b8cb-57699dcc9b4e',
  '7ae76e21-a3f2-4ff0-9267-9d80e2f1da90'
);
