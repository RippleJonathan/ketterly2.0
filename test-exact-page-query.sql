-- =====================================================
-- TEST EXACT QUERY FROM PAGE
-- =====================================================

-- This mimics the exact Supabase query from the page
-- Using the admin client (no RLS)
SELECT 
  leads.*,
  -- location
  json_build_object(
    'id', loc.id,
    'name', loc.name,
    'address', loc.address,
    'city', loc.city,
    'state', loc.state,
    'zip', loc.zip
  ) as location,
  -- sales_rep_user
  json_build_object(
    'id', sr.id,
    'full_name', sr.full_name,
    'email', sr.email
  ) as sales_rep_user,
  -- marketing_rep_user
  json_build_object(
    'id', mr.id,
    'full_name', mr.full_name,
    'email', mr.email
  ) as marketing_rep_user,
  -- sales_manager_user
  json_build_object(
    'id', sm.id,
    'full_name', sm.full_name,
    'email', sm.email
  ) as sales_manager_user,
  -- production_manager_user
  json_build_object(
    'id', pm.id,
    'full_name', pm.full_name,
    'email', pm.email
  ) as production_manager_user,
  -- created_user
  json_build_object(
    'id', creator.id,
    'full_name', creator.full_name,
    'email', creator.email
  ) as created_user
FROM leads
LEFT JOIN locations loc ON loc.id = leads.location_id
LEFT JOIN users sr ON sr.id = leads.sales_rep_id
LEFT JOIN users mr ON mr.id = leads.marketing_rep_id
LEFT JOIN users sm ON sm.id = leads.sales_manager_id
LEFT JOIN users pm ON pm.id = leads.production_manager_id
LEFT JOIN users creator ON creator.id = leads.created_by
WHERE leads.id = '9135ad0b-a5e3-425c-8213-8313b4cbfde6'
  AND leads.company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34'
  AND leads.deleted_at IS NULL;
