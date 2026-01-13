-- Check if trigger exists and is enabled on customer_invoices table
SELECT 
  t.tgname as trigger_name,
  t.tgtype as trigger_type,
  t.tgenabled as enabled,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname = 'customer_invoices'
AND t.tgname LIKE '%commission%';

-- Also check ALL triggers on customer_invoices
SELECT 
  t.tgname as trigger_name,
  CASE 
    WHEN t.tgenabled = 'O' THEN 'enabled'
    WHEN t.tgenabled = 'D' THEN 'disabled'
    WHEN t.tgenabled = 'R' THEN 'replica'
    WHEN t.tgenabled = 'A' THEN 'always'
    ELSE 'unknown'
  END as status,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'customer_invoices'
AND t.tgisinternal = false;
