-- Check ALL commissions for this lead
SELECT 
  lc.id,
  lc.assignment_field,
  u.full_name as user_name,
  lc.commission_rate,
  lc.calculated_amount,
  lc.status,
  lc.created_at,
  lc.deleted_at
FROM lead_commissions lc
JOIN users u ON u.id = lc.user_id
WHERE lc.lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
ORDER BY lc.created_at DESC;

-- Also check if the lead has sales_rep_id and marketing_rep_id assigned
SELECT 
  id,
  full_name,
  sales_rep_id,
  marketing_rep_id,
  sales_manager_id,
  production_manager_id,
  location_id
FROM leads
WHERE id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab';
