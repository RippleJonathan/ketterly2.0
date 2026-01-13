-- Check the sales rep user's commission settings
SELECT 
  id,
  full_name,
  commission_rate,
  marketing_commission_rate,
  paid_when,
  role
FROM users
WHERE id = '587fb7be-1afa-4839-81dd-615eef68b369';

-- Check if this user has location_users entry with commission settings
SELECT 
  lu.user_id,
  lu.location_id,
  lu.commission_enabled,
  lu.commission_type,
  lu.commission_rate as lu_commission_rate,
  lu.flat_commission_amount,
  lu.paid_when as lu_paid_when,
  lu.include_own_sales,
  u.full_name,
  u.commission_rate as user_commission_rate
FROM location_users lu
JOIN users u ON u.id = lu.user_id
WHERE lu.user_id = '587fb7be-1afa-4839-81dd-615eef68b369';
