-- Fix: Only Admin should be a system role (protected)
-- All other roles should be editable/deletable

UPDATE company_roles
SET is_system_role = false
WHERE role_name IN ('office', 'sales_manager', 'sales', 'production', 'marketing');

-- Verify the update
SELECT 
  role_name,
  display_name,
  is_system_role,
  user_count
FROM company_roles
ORDER BY is_system_role DESC, display_name;
