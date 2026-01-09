-- Check if user is assigned to any locations
SELECT 
  lu.id,
  lu.user_id,
  lu.location_id,
  lu.location_role,
  l.name as location_name,
  u.full_name,
  u.role as user_role
FROM location_users lu
JOIN users u ON u.id = lu.user_id
JOIN locations l ON l.id = lu.location_id
WHERE lu.user_id = '336702f4-19df-415e-a5fc-a9ab33bb7a19';

-- If the above returns no results, the user is not assigned to any location
-- Find available locations for the company
SELECT 
  l.id,
  l.name,
  l.is_primary,
  l.is_active
FROM locations l
JOIN users u ON u.company_id = l.company_id
WHERE u.id = '336702f4-19df-415e-a5fc-a9ab33bb7a19'
  AND l.is_active = true
  AND l.deleted_at IS NULL;

-- If you see locations above but the user is not assigned, run this to assign them:
-- Replace LOCATION_ID_HERE with the actual location ID from the query above
/*
INSERT INTO location_users (location_id, user_id, location_role, assigned_by)
VALUES (
  'LOCATION_ID_HERE',  -- Replace with actual location ID (e.g., Arizona branch)
  '336702f4-19df-415e-a5fc-a9ab33bb7a19',
  'member',
  (SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'office') LIMIT 1)
);
*/
