-- =====================================================
-- CHECK USER vs LEAD COMPANY MISMATCH
-- =====================================================

-- Query 1: Check Jonathan's user record and company
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.company_id,
  c.name as company_name,
  c.slug as company_slug
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
WHERE u.id = '6375ffe0-514e-41fc-b8cb-57699dcc9b4e';

-- Query 2: Check all companies in database
SELECT 
  id,
  name,
  slug,
  created_at,
  (SELECT COUNT(*) FROM users WHERE company_id = companies.id) as user_count,
  (SELECT COUNT(*) FROM leads WHERE company_id = companies.id AND deleted_at IS NULL) as lead_count
FROM companies
ORDER BY created_at;

-- Query 3: Check the lead's company
SELECT 
  c.id,
  c.name,
  c.slug,
  'This is the company the lead belongs to' as note
FROM companies c
WHERE c.id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

-- Query 4: FIX - Update the lead to use Jonathan's company_id
-- UNCOMMENT THIS AFTER SEEING QUERY 1 RESULTS:
-- UPDATE leads 
-- SET company_id = (SELECT company_id FROM users WHERE id = '6375ffe0-514e-41fc-b8cb-57699dcc9b4e')
-- WHERE id = '9135ad0b-a5e3-425c-8213-8313b4cbfde6';
