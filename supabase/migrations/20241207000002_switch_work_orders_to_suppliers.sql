-- Switch work_orders to use suppliers table instead of subcontractors
-- Run this in Supabase SQL Editor

-- Step 1: Drop the foreign key constraint to subcontractors
ALTER TABLE public.work_orders 
  DROP CONSTRAINT IF EXISTS work_orders_subcontractor_id_fkey;

-- Step 2: Add foreign key constraint to suppliers instead
ALTER TABLE public.work_orders 
  ADD CONSTRAINT work_orders_supplier_id_fkey 
  FOREIGN KEY (subcontractor_id) 
  REFERENCES public.suppliers(id) 
  ON DELETE RESTRICT;

-- Step 3: Add comment to clarify the field now references suppliers
COMMENT ON COLUMN public.work_orders.subcontractor_id IS 
  'References suppliers table where type IN (''subcontractor'', ''both'')';

-- Verify the change
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'work_orders'
  AND kcu.column_name = 'subcontractor_id';
