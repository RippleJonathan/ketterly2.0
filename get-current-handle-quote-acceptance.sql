-- Get the ACTUAL current definition of handle_quote_acceptance function
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_quote_acceptance'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
