-- Migrate existing team_lead_for_location data to teams table
-- File: supabase/migrations/20260108000005_migrate_existing_team_leads.sql

-- Step 1: Create teams from existing team leads
INSERT INTO teams (company_id, location_id, name, team_lead_id, commission_rate, paid_when, include_own_sales, is_active)
SELECT 
  l.company_id,
  lu.location_id,
  u.full_name || '''s Team' as name,
  lu.user_id as team_lead_id,
  COALESCE(lu.commission_rate, 2.0) as commission_rate,
  COALESCE(lu.paid_when, 'when_final_payment') as paid_when,
  COALESCE(lu.include_own_sales, false) as include_own_sales,
  true as is_active
FROM location_users lu
JOIN locations l ON l.id = lu.location_id
JOIN users u ON u.id = lu.user_id
WHERE lu.team_lead_for_location = true
  AND NOT EXISTS (
    SELECT 1 FROM teams t 
    WHERE t.location_id = lu.location_id 
    AND t.team_lead_id = lu.user_id
  );

-- Step 2: Show created teams
SELECT 
  l.name as location_name,
  t.name as team_name,
  u.full_name as team_lead_name,
  t.commission_rate,
  t.paid_when,
  t.include_own_sales
FROM teams t
JOIN locations l ON l.id = t.location_id
JOIN users u ON u.id = t.team_lead_id
WHERE t.deleted_at IS NULL
ORDER BY l.name, t.name;
