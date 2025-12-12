-- Seed default roles for existing company
-- Step 1: First, run this to find your company_id and user_id

SELECT 
  id as user_id,
  company_id,
  email,
  full_name
FROM users
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your actual email

-- Step 2: Copy the company_id and user_id from above, then run this:
-- (Uncomment and replace the UUIDs below)

/*
SELECT create_default_company_roles(
  'PASTE_COMPANY_ID_HERE'::UUID,
  'PASTE_USER_ID_HERE'::UUID
);
*/

-- Step 3: Verify roles were created:
-- SELECT * FROM company_roles ORDER BY is_system_role DESC, display_name;
