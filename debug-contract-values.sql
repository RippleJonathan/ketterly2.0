-- Debug query to check contract and quote values
-- Run this in Supabase SQL Editor to see actual database values

SELECT 
  'Contract' as source,
  sc.contract_number,
  sc.original_contract_price,
  sc.current_contract_price,
  sc.original_total,
  sc.original_subtotal,
  q.quote_number,
  q.subtotal as quote_subtotal,
  q.total_amount as quote_total,
  -- Calculate what values should be
  sc.original_total as expected_original,
  (
    SELECT COALESCE(SUM(total), 0) 
    FROM change_orders 
    WHERE quote_id = q.id 
      AND status = 'approved' 
      AND deleted_at IS NULL
  ) as approved_change_orders_total,
  (
    sc.original_total + (
      SELECT COALESCE(SUM(total), 0) 
      FROM change_orders 
      WHERE quote_id = q.id 
        AND status = 'approved' 
        AND deleted_at IS NULL
    )
  ) as expected_current_total
FROM signed_contracts sc
JOIN quotes q ON q.id = sc.quote_id
WHERE sc.deleted_at IS NULL
ORDER BY sc.created_at DESC
LIMIT 5;

-- Also check the change orders
SELECT 
  'Change Order' as type,
  co.change_order_number,
  co.status,
  co.total,
  q.quote_number,
  sc.contract_number
FROM change_orders co
LEFT JOIN quotes q ON q.id = co.quote_id
LEFT JOIN signed_contracts sc ON sc.quote_id = q.id
WHERE co.deleted_at IS NULL
ORDER BY co.created_at DESC
LIMIT 10;
