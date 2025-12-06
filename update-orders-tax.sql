-- Update existing material orders with current company tax rate
-- Run this AFTER you've set your company tax rate in Settings

-- First, check current company tax rate
SELECT name, tax_rate FROM companies WHERE deleted_at IS NULL;

-- Update all existing orders to use the company's current tax rate
-- and recalculate tax amounts
UPDATE material_orders
SET 
  tax_rate = companies.tax_rate,
  tax_amount = total_estimated * companies.tax_rate,
  total_with_tax = total_estimated + (total_estimated * companies.tax_rate)
FROM companies
WHERE material_orders.company_id = companies.id
  AND material_orders.deleted_at IS NULL
  AND material_orders.tax_rate = 0;  -- Only update orders with zero tax

-- Verify the update
SELECT 
  order_number,
  total_estimated,
  tax_rate,
  tax_amount,
  total_with_tax
FROM material_orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
