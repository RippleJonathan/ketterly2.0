-- =====================================================================
-- COMPLETE CONTRACT SIGNING TEST SCRIPT
-- =====================================================================
-- This script tests the full flow:
-- 1. Contract signed → Invoice created (with new number format)
-- 2. Invoice created → Commissions auto-created (via trigger)
-- 3. Refresh button → Creates/updates all commissions
-- =====================================================================

-- ========== STEP 1: CHECK INVOICE NUMBERS ==========
-- Should see format: INV-2026-0001, INV-2026-0002, etc.
SELECT 
  invoice_number,
  lead_id,
  quote_id,
  total,
  status,
  created_at,
  notes
FROM customer_invoices
WHERE company_id = (SELECT id FROM companies WHERE name = 'Ripple Roofing' LIMIT 1)
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ========== STEP 2: CHECK QUOTE SIGNATURES ==========
-- Should see both 'customer' and 'company_rep' signatures for accepted quotes
SELECT 
  qs.id,
  qs.quote_id,
  q.quote_number,
  q.status as quote_status,
  qs.signer_type,
  qs.signer_name,
  qs.created_at as signed_at
FROM quote_signatures qs
JOIN quotes q ON q.id = qs.quote_id
WHERE qs.deleted_at IS NULL
ORDER BY qs.created_at DESC
LIMIT 10;

-- ========== STEP 3: CHECK ALL COMMISSIONS FOR A SPECIFIC LEAD ==========
-- Replace 'YOUR_LEAD_ID' with the lead ID you're testing
-- Should see: sales_rep, marketing_rep, office_override (and possibly sales_manager, team_lead)
SELECT 
  lc.id,
  lc.lead_id,
  lc.user_id,
  u.full_name,
  lc.assignment_field,
  lc.commission_type,
  lc.commission_rate,
  lc.calculated_amount,
  lc.status,
  lc.notes,
  lc.created_at
FROM lead_commissions lc
JOIN users u ON u.id = lc.user_id
WHERE lc.lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab' -- REPLACE WITH YOUR LEAD ID
AND lc.deleted_at IS NULL
ORDER BY lc.created_at DESC;

-- ========== STEP 4: CHECK RECENT COMMISSIONS (ALL LEADS) ==========
SELECT 
  lc.id,
  l.full_name as customer_name,
  lc.lead_id,
  u.full_name as user_name,
  lc.assignment_field,
  lc.calculated_amount,
  lc.status,
  lc.notes,
  lc.created_at
FROM lead_commissions lc
JOIN users u ON u.id = lc.user_id
JOIN leads l ON l.id = lc.lead_id
WHERE lc.company_id = (SELECT id FROM companies WHERE name = 'Ripple Roofing' LIMIT 1)
AND lc.deleted_at IS NULL
ORDER BY lc.created_at DESC
LIMIT 20;

-- ========== STEP 5: VERIFY COMMISSION COMPLETENESS FOR A LEAD ==========
-- This shows what commissions SHOULD exist vs what DOES exist
WITH lead_assignments AS (
  SELECT 
    l.id as lead_id,
    l.full_name as customer_name,
    l.sales_rep_id,
    l.marketing_rep_id,
    l.sales_manager_id,
    l.production_manager_id,
    l.location_id
  FROM leads l
  WHERE l.id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab' -- REPLACE WITH YOUR LEAD ID
),
expected_commissions AS (
  SELECT lead_id, 'sales_rep_id' as field, sales_rep_id as user_id FROM lead_assignments WHERE sales_rep_id IS NOT NULL
  UNION ALL
  SELECT lead_id, 'marketing_rep_id', marketing_rep_id FROM lead_assignments WHERE marketing_rep_id IS NOT NULL
  UNION ALL
  SELECT lead_id, 'sales_manager_id', sales_manager_id FROM lead_assignments WHERE sales_manager_id IS NOT NULL
  UNION ALL
  SELECT lead_id, 'production_manager_id', production_manager_id FROM lead_assignments WHERE production_manager_id IS NOT NULL
  UNION ALL
  -- Office managers from location
  SELECT la.lead_id, 'office_override', lu.user_id
  FROM lead_assignments la
  JOIN location_users lu ON lu.location_id = la.location_id
  JOIN users u ON u.id = lu.user_id
  WHERE lu.commission_enabled = true
  AND u.role = 'office'
  AND u.deleted_at IS NULL
)
SELECT 
  ec.field as expected_assignment_field,
  u.full_name as expected_user,
  CASE 
    WHEN lc.id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  lc.calculated_amount,
  lc.created_at
FROM expected_commissions ec
JOIN users u ON u.id = ec.user_id
LEFT JOIN lead_commissions lc ON lc.lead_id = ec.lead_id 
  AND lc.user_id = ec.user_id 
  AND lc.assignment_field = ec.field
  AND lc.deleted_at IS NULL
ORDER BY ec.field;

-- ========== CLEANUP COMMANDS (USE WITH CAUTION) ==========

-- Delete test commissions for a specific lead (last hour only)
-- UNCOMMENT TO USE:
-- DELETE FROM lead_commissions 
-- WHERE lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
-- AND created_at > NOW() - INTERVAL '1 hour';

-- Soft delete a test invoice
-- UNCOMMENT TO USE:
-- UPDATE customer_invoices 
-- SET deleted_at = NOW() 
-- WHERE invoice_number = 'INV-2026-0031' 
-- AND deleted_at IS NULL;

-- Delete ALL commissions for a lead (DANGEROUS - use only for testing)
-- UNCOMMENT TO USE:
-- DELETE FROM lead_commissions 
-- WHERE lead_id = 'd90a932e-ed35-4229-bd3c-7d3f2747c7ab'
-- AND deleted_at IS NULL;
