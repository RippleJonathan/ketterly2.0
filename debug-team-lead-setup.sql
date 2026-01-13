-- Debug team lead commission setup for a specific lead
-- Replace 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab' with your lead ID

WITH lead_info AS (
  SELECT 
    l.id as lead_id,
    l.full_name as customer_name,
    l.sales_rep_id,
    l.location_id,
    u.full_name as sales_rep_name
  FROM leads l
  LEFT JOIN users u ON u.id = l.sales_rep_id
  WHERE l.id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
)
SELECT 
  li.customer_name,
  li.sales_rep_name,
  lu.user_id as location_user_id,
  lu.team_id,
  t.id as team_id_check,
  t.team_lead_id,
  lead_user.full_name as team_lead_name,
  t.commission_rate as team_commission_rate,
  t.is_active as team_is_active,
  lu.commission_enabled as location_user_commission_enabled
FROM lead_info li
LEFT JOIN location_users lu ON lu.user_id = li.sales_rep_id AND lu.location_id = li.location_id
LEFT JOIN teams t ON t.id = lu.team_id
LEFT JOIN users lead_user ON lead_user.id = t.team_lead_id
WHERE li.lead_id IS NOT NULL;
