-- Check for triggers on quote_signatures table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'quote_signatures'
ORDER BY trigger_name;

-- Check the quote_signatures table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'quote_signatures'
ORDER BY ordinal_position;
