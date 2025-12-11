-- =====================================================
-- VERIFICATION SCRIPT FOR ROLE PERMISSION TEMPLATES
-- =====================================================
-- Run this after applying the migration to verify it worked correctly

-- Step 1: Check table was created
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'role_permission_templates'
) AS table_exists;
-- Expected: true

-- Step 2: Count role templates per company
SELECT 
  c.name AS company_name,
  COUNT(rpt.id) AS template_count
FROM companies c
LEFT JOIN role_permission_templates rpt ON c.id = rpt.company_id
WHERE c.deleted_at IS NULL AND rpt.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY c.name;
-- Expected: Each company should have 7 templates (one per role)

-- Step 3: Verify all roles are seeded for a specific company
SELECT 
  role,
  can_view_leads,
  can_create_leads,
  can_edit_leads,
  can_delete_leads,
  can_approve_quotes,
  can_edit_company_settings
FROM role_permission_templates
WHERE company_id = 'YOUR_COMPANY_ID_HERE' -- Replace with your company ID
  AND deleted_at IS NULL
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'office' THEN 2
    WHEN 'sales_manager' THEN 3
    WHEN 'sales' THEN 4
    WHEN 'production' THEN 5
    WHEN 'marketing' THEN 6
    WHEN 'super_admin' THEN 7
  END;
-- Expected: 7 rows with different permission patterns

-- Step 4: Count enabled permissions per role
SELECT 
  role,
  (
    CAST(can_view_leads AS INTEGER) + CAST(can_create_leads AS INTEGER) +
    CAST(can_edit_leads AS INTEGER) + CAST(can_delete_leads AS INTEGER) +
    CAST(can_view_all_leads AS INTEGER) + CAST(can_view_quotes AS INTEGER) +
    CAST(can_create_quotes AS INTEGER) + CAST(can_edit_quotes AS INTEGER) +
    CAST(can_delete_quotes AS INTEGER) + CAST(can_approve_quotes AS INTEGER) +
    CAST(can_send_quotes AS INTEGER) + CAST(can_view_invoices AS INTEGER) +
    CAST(can_create_invoices AS INTEGER) + CAST(can_edit_invoices AS INTEGER) +
    CAST(can_delete_invoices AS INTEGER) + CAST(can_record_payments AS INTEGER) +
    CAST(can_void_payments AS INTEGER) + CAST(can_view_material_orders AS INTEGER) +
    CAST(can_create_material_orders AS INTEGER) + CAST(can_edit_material_orders AS INTEGER) +
    CAST(can_delete_material_orders AS INTEGER) + CAST(can_mark_orders_paid AS INTEGER) +
    CAST(can_view_work_orders AS INTEGER) + CAST(can_create_work_orders AS INTEGER) +
    CAST(can_edit_work_orders AS INTEGER) + CAST(can_delete_work_orders AS INTEGER) +
    CAST(can_assign_crew AS INTEGER) + CAST(can_view_customers AS INTEGER) +
    CAST(can_create_customers AS INTEGER) + CAST(can_edit_customers AS INTEGER) +
    CAST(can_delete_customers AS INTEGER) + CAST(can_view_financials AS INTEGER) +
    CAST(can_view_profit_margins AS INTEGER) + CAST(can_view_commission_reports AS INTEGER) +
    CAST(can_export_reports AS INTEGER) + CAST(can_view_users AS INTEGER) +
    CAST(can_create_users AS INTEGER) + CAST(can_edit_users AS INTEGER) +
    CAST(can_delete_users AS INTEGER) + CAST(can_manage_permissions AS INTEGER) +
    CAST(can_edit_company_settings AS INTEGER) + CAST(can_upload_photos AS INTEGER) +
    CAST(can_update_project_status AS INTEGER) + CAST(can_view_project_timeline AS INTEGER)
  ) AS enabled_permissions
FROM role_permission_templates
WHERE company_id = 'YOUR_COMPANY_ID_HERE' -- Replace with your company ID
  AND deleted_at IS NULL
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'office' THEN 2
    WHEN 'sales_manager' THEN 3
    WHEN 'sales' THEN 4
    WHEN 'production' THEN 5
    WHEN 'marketing' THEN 6
    WHEN 'super_admin' THEN 7
  END;
-- Expected:
-- admin: 44
-- office: 30
-- sales_manager: 29
-- sales: 21
-- production: 10
-- marketing: 15
-- super_admin: 0

-- Step 5: Test the helper function
SELECT * FROM get_role_template_permissions(
  'YOUR_COMPANY_ID_HERE', -- Replace with your company ID
  'sales'
);
-- Expected: Returns all 44 permission columns with sales role values

-- Step 6: Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'role_permission_templates';
-- Expected: At least one RLS policy exists

-- Step 7: Check if trigger exists for auto-seeding new companies
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'companies'
  AND trigger_name = 'auto_seed_role_templates';
-- Expected: One trigger that fires AFTER INSERT

-- =====================================================
-- TESTING NEW COMPANY CREATION
-- =====================================================

-- Create a test company and verify auto-seeding
-- (Only run if you want to test - this creates real data)

/*
INSERT INTO companies (name, slug, contact_email)
VALUES ('Test Company', 'test-company-' || gen_random_uuid()::text, 'test@example.com')
RETURNING id;

-- Check if templates were auto-created for the new company
SELECT role, COUNT(*) 
FROM role_permission_templates 
WHERE company_id = 'RETURNED_ID_FROM_ABOVE'
GROUP BY role;
-- Expected: 7 rows
*/

-- =====================================================
-- CLEANUP TEST DATA (if you created a test company)
-- =====================================================

/*
DELETE FROM role_permission_templates WHERE company_id = 'TEST_COMPANY_ID';
DELETE FROM companies WHERE id = 'TEST_COMPANY_ID';
*/
