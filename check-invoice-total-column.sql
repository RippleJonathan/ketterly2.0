-- Check customer_invoices table structure for total amount column name
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'customer_invoices'
AND column_name LIKE '%total%'
ORDER BY ordinal_position;
