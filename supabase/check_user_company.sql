-- =============================================
-- CHECK USER COMPANY_ID WITHOUT AUTH
-- =============================================
-- Since auth.uid() isn't working in the SQL editor,
-- we'll check users directly.
-- =============================================

-- =============================================
-- OPTION 1: List all users and their companies
-- =============================================
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.company_id,
  u.role,
  c.name AS company_name,
  c.slug AS company_slug
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
ORDER BY u.created_at DESC;

-- Look for YOUR email in this list
-- Make sure you have a company_id!


-- =============================================
-- OPTION 2: Check if you have ANY users with company_id
-- =============================================
SELECT 
  COUNT(*) AS total_users,
  COUNT(company_id) AS users_with_company,
  COUNT(*) - COUNT(company_id) AS users_without_company
FROM public.users;

-- If users_without_company > 0, you need to assign company_id


-- =============================================
-- OPTION 3: Get your auth user ID from Supabase Auth
-- =============================================
-- Go to: Supabase Dashboard → Authentication → Users
-- Find your user and copy the UUID
-- Then run this query, replacing the UUID:

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.company_id,
  u.role,
  c.name AS company_name
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE u.email = 'YOUR_EMAIL_HERE@example.com';  -- Replace with your actual email

-- =============================================
-- FIX: If you found your user but company_id is NULL
-- =============================================
-- First, get a company_id from the companies table:

SELECT id, name, slug FROM public.companies;

-- Then assign it to your user (replace the UUIDs):

-- UPDATE public.users 
-- SET company_id = 'YOUR_COMPANY_ID_FROM_ABOVE'
-- WHERE email = 'YOUR_EMAIL@example.com';


-- =============================================
-- VERIFY THE FIX
-- =============================================
SELECT 
  u.email,
  u.company_id,
  c.name AS company_name
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE u.email = 'YOUR_EMAIL@example.com';

-- Expected result: company_id should NOT be null
