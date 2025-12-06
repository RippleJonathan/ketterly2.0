-- Test query to check if tax columns exist and have data
-- Copy and paste this into Supabase SQL Editor

-- 1. Check if columns exist in material_orders table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'material_orders'
  AND column_name IN ('tax_rate', 'tax_amount', 'total_with_tax')
ORDER BY column_name;

-- 2. Check actual order data
SELECT 
  id,
  order_number,
  total_estimated,
  tax_rate,
  tax_amount,
  total_with_tax,
  created_at
FROM material_orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check company tax rate
SELECT 
  id,
  name,
  state,
  tax_rate
FROM companies
WHERE deleted_at IS NULL;
