-- Debug why sales rep commission is not being created by trigger
-- Run this to check the actual data the trigger would see

-- 1. Check the lead data (what the trigger fetches)
SELECT 
  id,
  sales_rep_id,
  marketing_rep_id,
  sales_manager_id,
  production_manager_id
FROM leads
WHERE id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab';

-- 2. Check the invoice that was created
SELECT 
  id,
  invoice_number,
  lead_id,
  total,
  created_at
FROM customer_invoices
WHERE lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check what commissions exist after trigger ran
SELECT 
  id,
  user_id,
  assignment_field,
  calculated_amount,
  created_at,
  deleted_at
FROM lead_commissions
WHERE lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
ORDER BY created_at DESC;

-- 4. Simulate the NOT EXISTS check for sales rep (exact query from trigger)
-- Replace with actual sales_rep_id from query #1
WITH lead_data AS (
  SELECT sales_rep_id, marketing_rep_id
  FROM leads
  WHERE id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
)
SELECT 
  'Sales Rep Commission Exists?' as check_type,
  EXISTS (
    SELECT 1 FROM lead_commissions
    WHERE lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
    AND user_id = (SELECT sales_rep_id FROM lead_data)
    AND assignment_field = 'sales_rep_id'
    AND deleted_at IS NULL
  ) as commission_exists,
  (SELECT sales_rep_id FROM lead_data) as sales_rep_id;

-- 5. Simulate the NOT EXISTS check for marketing rep
WITH lead_data AS (
  SELECT sales_rep_id, marketing_rep_id
  FROM leads
  WHERE id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
)
SELECT 
  'Marketing Rep Commission Exists?' as check_type,
  EXISTS (
    SELECT 1 FROM lead_commissions
    WHERE lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
    AND user_id = (SELECT marketing_rep_id FROM lead_data)
    AND assignment_field = 'marketing_rep_id'
    AND deleted_at IS NULL
  ) as commission_exists,
  (SELECT marketing_rep_id FROM lead_data) as marketing_rep_id;

-- 6. Check if there are ANY commissions with assignment_field = NULL
SELECT 
  id,
  user_id,
  assignment_field,
  calculated_amount,
  created_at
FROM lead_commissions
WHERE lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
AND assignment_field IS NULL
AND deleted_at IS NULL;
