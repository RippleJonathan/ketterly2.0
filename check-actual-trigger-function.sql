-- Get the ACTUAL trigger function code from the database
SELECT 
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'auto_create_commissions_on_invoice'
AND n.nspname = 'public';
