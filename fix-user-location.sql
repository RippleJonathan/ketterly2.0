-- Fix: Move user from Texas branch to Arizona office
-- User: 336702f4-19df-415e-a5fc-a9ab33bb7a19
-- From: 18a6cddb-bde6-4ca0-9aab-2a5f1691ab16 (Texas)
-- To: bdf94cd4-c718-4e41-9f42-6edf9b3b54cc (Arizona)

UPDATE location_users
SET location_id = 'bdf94cd4-c718-4e41-9f42-6edf9b3b54cc'
WHERE user_id = '336702f4-19df-415e-a5fc-a9ab33bb7a19'
  AND location_id = '18a6cddb-bde6-4ca0-9aab-2a5f1691ab16';

-- Verify the change
SELECT 
  lu.id,
  l.name as location_name,
  u.full_name,
  u.role,
  lu.location_role
FROM location_users lu
JOIN users u ON u.id = lu.user_id
JOIN locations l ON l.id = lu.location_id
WHERE lu.user_id = '336702f4-19df-415e-a5fc-a9ab33bb7a19';
