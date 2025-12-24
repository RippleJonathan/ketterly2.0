-- Check all RLS policies on company_documents table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,  -- USING clause
  with_check  -- WITH CHECK clause
FROM pg_policies 
WHERE tablename = 'company_documents'
ORDER BY cmd, policyname;
