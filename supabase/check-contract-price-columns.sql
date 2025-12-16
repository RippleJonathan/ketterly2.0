-- Check if contract price tracking columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'signed_contracts' 
AND column_name IN ('original_contract_price', 'current_contract_price')
ORDER BY column_name;

-- If the above query returns 0 rows, run the migration:
-- supabase/migrations/20241215000002_add_change_order_buttons_and_tracking.sql
