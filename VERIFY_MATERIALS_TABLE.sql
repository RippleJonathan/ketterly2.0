-- Run this in Supabase SQL Editor to verify materials table structure
-- This will show you exactly what columns exist

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'materials'
) as table_exists;

-- 2. List all columns in materials table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'materials'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'materials';

-- 4. Try to insert a test record (will fail if columns don't match)
-- Uncomment to test:
/*
INSERT INTO public.materials (
  company_id, 
  name, 
  category, 
  unit, 
  current_cost, 
  default_per_square
) VALUES (
  (SELECT id FROM public.companies LIMIT 1),
  'Test Material',
  'shingles',
  'bundle',
  99.99,
  3.0
) RETURNING *;
*/

-- 5. Check if schema was recently reloaded
SELECT NOW() as current_time;
