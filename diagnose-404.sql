-- =====================================================
-- DIAGNOSTIC SCRIPT - Find out why leads are 404
-- =====================================================

-- 1. Check YOUR current logged in user (auto-detects)
SELECT 
  id,
  email,
  full_name,
  company_id,
  role,
  is_active,
  CASE 
    WHEN is_active = false THEN '⚠️ USER IS INACTIVE!'
    ELSE '✓ User is active'
  END as status_check
FROM users 
WHERE id = auth.uid();

-- 2. Check if YOUR user has permissions record
SELECT 
  user_id,
  can_view_lead_details,
  can_view_lead_checklist,
  can_view_lead_estimates,
  CASE 
    WHEN user_id IS NULL THEN '⚠️ NO PERMISSIONS FOUND!'
    WHEN can_view_lead_details = false THEN '⚠️ CANNOT VIEW LEAD DETAILS!'
    ELSE '✓ Has basic permissions'
  END as permissions_check
FROM user_permissions 
WHERE user_id = auth.uid();

-- 3. Check if company still exists
SELECT 
  id,
  name,
  CASE 
    WHEN id IS NULL THEN '⚠️ COMPANY NOT FOUND!'
    ELSE '✓ Company exists'
  END as company_check
FROM companies 
WHERE id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

-- 4. Check if the specific lead exists in database
SELECT 
  id,
  full_name,
  company_id,
  deleted_at,
  created_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '⚠️ SOFT DELETED!'
    WHEN company_id != '2ff29cd1-22b1-4dc3-b1df-689d5e141c34' THEN '⚠️ WRONG COMPANY!'
    ELSE '✓ Lead is active'
  END as lead_check
FROM leads 
WHERE id = '26283ea6-ec47-49f0-99d3-4b0868849d78';

-- 5. Check all leads for this company (to see if any exist)
SELECT 
  COUNT(*) as total_leads,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ NO LEADS FOUND FOR THIS COMPANY!'
    ELSE CONCAT('✓ Found ', COUNT(*), ' leads')
  END as leads_check
FROM leads 
WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34'
AND deleted_at IS NULL;

-- =====================================================
-- POTENTIAL FIXES (run if diagnostics show problems)
-- =====================================================

-- FIX 1: If permissions are missing, grant all admin permissions
-- Uncomment and run this if query 2 shows NO PERMISSIONS FOUND:
/*
INSERT INTO user_permissions (
  user_id,
  can_view_lead_details,
  can_edit_lead_details,
  can_delete_leads,
  can_view_lead_checklist,
  can_view_lead_measurements,
  can_view_lead_estimates,
  can_view_lead_orders,
  can_view_lead_photos,
  can_view_lead_notes,
  can_view_lead_documents,
  can_view_lead_payments,
  can_view_lead_financials,
  can_view_lead_commissions
) 
SELECT 
  auth.uid(),
  true, true, true, true, true, true, true, true, true, true, true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM user_permissions WHERE user_id = auth.uid()
);
*/

-- FIX 2: If you deleted your user record, you need to recreate it
-- Contact support or check auth.users table in Supabase dashboard
