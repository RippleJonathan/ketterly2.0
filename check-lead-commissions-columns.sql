-- First check what columns exist in lead_commissions table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'lead_commissions'
ORDER BY ordinal_position;
