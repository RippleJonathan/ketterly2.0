-- ================================================
-- FIX LOCATION ASSIGNMENTS FOR ARIZONA USERS
-- ================================================
-- Problem: Users created by Arizona office user are being assigned to Texas location
-- Root cause: The office user who created them is also in the wrong location

-- Step 1: Find all users currently in wrong location (Texas instead of Arizona)
-- ================================================
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.role,
  lu.location_id,
  l.name as current_location_name,
  lu.location_role,
  lu.assigned_at,
  lu.assigned_by
FROM users u
JOIN location_users lu ON u.id = lu.user_id
JOIN locations l ON lu.location_id = l.id
WHERE lu.location_id = '18a6cddb-bde6-4ca0-9aab-2a5f1691ab16'  -- Texas branch
ORDER BY lu.assigned_at DESC;

-- Step 2: Find who assigned these users (to identify the office user who's in wrong location)
-- ================================================
SELECT DISTINCT
  assigner.id as assigner_id,
  assigner.full_name as assigner_name,
  assigner.email as assigner_email,
  assigner.role as assigner_role
FROM location_users lu
JOIN users assigner ON lu.assigned_by = assigner.id
WHERE lu.location_id = '18a6cddb-bde6-4ca0-9aab-2a5f1691ab16';  -- Texas branch

-- Step 3: MOVE ALL ARIZONA USERS FROM TEXAS TO ARIZONA
-- ================================================
-- WARNING: Run this after verifying the above queries show the right users!

UPDATE location_users 
SET location_id = 'bdf94cd4-c718-4e41-9f42-6edf9b3b54cc'  -- Arizona office
WHERE location_id = '18a6cddb-bde6-4ca0-9aab-2a5f1691ab16'  -- Texas branch
  AND user_id IN (
    -- Add user IDs here after reviewing step 1 results
    -- Example:
    '336702f4-19df-415e-a5fc-a9ab33bb7a19'  -- Current sales user
    -- Add more user IDs as needed, comma-separated
  );

-- Step 4: Verify the fix
-- ================================================
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.role,
  lu.location_id,
  l.name as location_name,
  lu.location_role
FROM users u
JOIN location_users lu ON u.id = lu.user_id
JOIN locations l ON lu.location_id = l.id
WHERE lu.location_id = 'bdf94cd4-c718-4e41-9f42-6edf9b3b54cc'  -- Arizona office
ORDER BY u.full_name;

-- Step 5: Check for any remaining users in Texas that shouldn't be there
-- ================================================
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.role,
  l.name as location_name
FROM users u
JOIN location_users lu ON u.id = lu.user_id
JOIN locations l ON lu.location_id = l.id
WHERE lu.location_id = '18a6cddb-bde6-4ca0-9aab-2a5f1691ab16'  -- Texas branch
ORDER BY u.full_name;
