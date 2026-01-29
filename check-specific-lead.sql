-- =====================================================
-- CHECK SPECIFIC LEAD: 9135ad0b-a5e3-425c-8213-8313b4cbfde6
-- =====================================================

-- Query 1: Check if lead exists at all
SELECT 
  id,
  full_name,
  company_id,
  deleted_at,
  created_at,
  'Lead exists in database' as status
FROM leads
WHERE id = '9135ad0b-a5e3-425c-8213-8313b4cbfde6';

-- Query 2: Check related user IDs and if they exist
SELECT 
  l.id as lead_id,
  l.full_name,
  l.sales_rep_id,
  l.marketing_rep_id,
  l.sales_manager_id,
  l.production_manager_id,
  l.created_by,
  -- Check if these users exist
  sr.full_name as sales_rep_name,
  mr.full_name as marketing_rep_name,
  sm.full_name as sales_manager_name,
  pm.full_name as production_manager_name,
  creator.full_name as created_by_name
FROM leads l
LEFT JOIN users sr ON sr.id = l.sales_rep_id
LEFT JOIN users mr ON mr.id = l.marketing_rep_id
LEFT JOIN users sm ON sm.id = l.sales_manager_id
LEFT JOIN users pm ON pm.id = l.production_manager_id
LEFT JOIN users creator ON creator.id = l.created_by
WHERE l.id = '9135ad0b-a5e3-425c-8213-8313b4cbfde6';

-- Query 3: Check location_id
SELECT 
  l.id as lead_id,
  l.full_name,
  l.location_id,
  loc.name as location_name,
  CASE 
    WHEN l.location_id IS NULL THEN 'Location ID is NULL'
    WHEN loc.id IS NULL THEN 'Location does not exist'
    ELSE 'Location exists'
  END as location_status
FROM leads l
LEFT JOIN locations loc ON loc.id = l.location_id
WHERE l.id = '9135ad0b-a5e3-425c-8213-8313b4cbfde6';

-- Query 4: Check your company ID
SELECT 
  u.full_name,
  u.email,
  u.company_id,
  'Your company ID' as status
FROM users u
WHERE u.id = auth.uid();

-- Query 5: Compare lead company_id with your company_id
SELECT 
  l.id as lead_id,
  l.full_name,
  l.company_id as lead_company_id,
  u.company_id as your_company_id,
  CASE 
    WHEN l.company_id = u.company_id THEN '✅ MATCH - You should be able to see this lead'
    ELSE '❌ MISMATCH - Lead belongs to different company!'
  END as company_match_status
FROM leads l
CROSS JOIN (SELECT company_id FROM users WHERE id = auth.uid()) u
WHERE l.id = '9135ad0b-a5e3-425c-8213-8313b4cbfde6';
