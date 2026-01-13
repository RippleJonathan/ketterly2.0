-- Check for ALL triggers on quote_signatures table
SELECT 
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'quote_signatures'
AND n.nspname = 'public'
AND NOT t.tgisinternal
ORDER BY t.tgname;
