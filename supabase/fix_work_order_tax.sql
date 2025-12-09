-- Fix existing work orders to remove tax
-- Run this in Supabase SQL Editor

-- Update all existing work orders to have no tax
UPDATE public.work_orders
SET 
  tax_rate = 0,
  tax_amount = 0,
  include_tax = false,
  total_amount = subtotal
WHERE tax_amount > 0 OR tax_rate > 0 OR include_tax = true;

-- Verify the changes
SELECT 
  work_order_number,
  subtotal,
  tax_rate,
  tax_amount,
  total_amount,
  include_tax
FROM public.work_orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
