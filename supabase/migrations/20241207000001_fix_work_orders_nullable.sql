-- Fix work_orders table to make subcontractor fields nullable
-- Run this in Supabase SQL Editor

-- Remove NOT NULL constraint from subcontractor_name if it exists
ALTER TABLE public.work_orders 
  ALTER COLUMN subcontractor_name DROP NOT NULL;

-- Also make sure these related fields are nullable
ALTER TABLE public.work_orders 
  ALTER COLUMN subcontractor_email DROP NOT NULL;

ALTER TABLE public.work_orders 
  ALTER COLUMN subcontractor_phone DROP NOT NULL;

-- Verify the change
SELECT 
  column_name, 
  is_nullable, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
  AND column_name IN ('subcontractor_name', 'subcontractor_email', 'subcontractor_phone')
ORDER BY column_name;
