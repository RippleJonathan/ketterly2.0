-- Query to verify calendar_events RLS policies
-- Run this to see what policies are active and their configuration

SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  CASE 
    WHEN qual IS NOT NULL THEN '✓ Yes' 
    ELSE '✗ No' 
  END as "Has USING",
  CASE 
    WHEN with_check IS NOT NULL THEN '⚠️ YES (PROBLEM!)' 
    ELSE '✓ No (Good)' 
  END as "Has WITH CHECK",
  qual as "USING Clause",
  with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'calendar_events'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END,
  policyname;
