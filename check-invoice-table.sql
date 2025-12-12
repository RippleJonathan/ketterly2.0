-- First, let's verify the customer_invoices table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_invoices'
ORDER BY ordinal_position;
