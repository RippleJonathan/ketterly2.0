-- =============================================
-- COMPREHENSIVE FIX FOR QUOTE SIGNATURE SYSTEM
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- 1. Fix the trigger function to use 'production' instead of 'won'
CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  quote_record RECORD;
BEGIN
  -- Get quote details
  SELECT * INTO quote_record
  FROM quotes
  WHERE id = NEW.quote_id;
  
  -- Update quote status to 'accepted'
  UPDATE quotes
  SET 
    status = 'accepted',
    accepted_at = NEW.signed_at,
    updated_at = NOW()
  WHERE id = NEW.quote_id;
  
  -- Update lead status to 'production' (quote accepted, project starting)
  -- Changed from 'won' to match current status constraint
  UPDATE leads
  SET 
    status = 'production',
    quoted_amount = quote_record.total_amount,
    updated_at = NOW()
  WHERE id = quote_record.lead_id;
  
  -- If there are other quote options for this lead, mark them as 'declined'
  UPDATE quotes
  SET 
    status = 'declined',
    updated_at = NOW()
  WHERE 
    lead_id = quote_record.lead_id
    AND id != NEW.quote_id
    AND status NOT IN ('accepted', 'declined');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Verify the trigger is attached (re-create if needed)
DROP TRIGGER IF EXISTS on_quote_signature_created ON quote_signatures;
CREATE TRIGGER on_quote_signature_created
  AFTER INSERT ON quote_signatures
  FOR EACH ROW
  EXECUTE FUNCTION handle_quote_acceptance();

-- 3. Verify current lead status constraint values
-- Run this to see what status values are allowed:
-- SELECT conname, consrc 
-- FROM pg_constraint 
-- WHERE conname = 'leads_status_check';

-- Expected result should include: 'new', 'quote', 'production', 'invoiced', 'closed', 'lost', 'archived'
-- Should NOT include 'won' anymore (that was replaced by 'production')

-- 4. Optional: Update any existing leads with status='won' to 'production'
-- This ensures data consistency if any old records exist
UPDATE leads 
SET status = 'production' 
WHERE status = 'won' 
  AND deleted_at IS NULL;

-- =============================================
-- VERIFICATION QUERIES (run these after applying)
-- =============================================

-- Check that the function was updated
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_quote_acceptance'
  AND n.nspname = 'public';

-- Verify trigger exists
SELECT 
  tgname AS trigger_name,
  tgtype,
  tgenabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_quote_signature_created';

-- Check for any leads still using 'won' status
SELECT id, full_name, status, updated_at
FROM leads
WHERE status = 'won'
  AND deleted_at IS NULL;
