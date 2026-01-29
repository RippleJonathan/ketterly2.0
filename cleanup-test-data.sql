-- =====================================================
-- CLEANUP TEST DATA FOR KETTERLY
-- Company ID: 2ff29cd1-22b1-4dc3-b1df-689d5e141c34
-- =====================================================
-- This script removes all lead-related data but keeps:
-- - Company settings
-- - Users and permissions
-- - Locations
-- - Commission plans
-- - Role templates
-- =====================================================

BEGIN;

-- Step 1: Delete all lead-related child data (safest - no dependencies)
DELETE FROM lead_checklist_items WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM quote_line_items WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM commissions WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM payments WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM customer_invoices WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM work_orders WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM lead_photos WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM lead_files WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM lead_measurements WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM lead_events WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM activities WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM lead_notes WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

-- Step 2: Delete quotes (depends on leads)
DELETE FROM quotes WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

-- Step 3: Delete leads (remove user references first to avoid constraint issues)
UPDATE leads SET 
  sales_rep_id = NULL,
  marketing_rep_id = NULL, 
  sales_manager_id = NULL,
  production_manager_id = NULL,
  created_by = NULL
WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

DELETE FROM leads WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

-- Step 4: Clean up any orphaned records
DELETE FROM change_orders WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
DELETE FROM contract_versions WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to confirm cleanup
-- =====================================================

-- Should all return 0
SELECT COUNT(*) as remaining_leads FROM leads WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
SELECT COUNT(*) as remaining_quotes FROM quotes WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
SELECT COUNT(*) as remaining_invoices FROM customer_invoices WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
SELECT COUNT(*) as remaining_payments FROM payments WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
SELECT COUNT(*) as remaining_activities FROM activities WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';

-- Should still have data (users, locations, etc.)
SELECT COUNT(*) as remaining_users FROM users WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
SELECT COUNT(*) as remaining_locations FROM locations WHERE company_id = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34';
