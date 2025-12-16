-- =====================================================================
-- DROP CHANGE ORDER TRIGGER
-- Remove trigger that references dropped needs_new_signature column
-- =====================================================================

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_mark_quote_needs_signature ON change_orders;

-- Drop the function
DROP FUNCTION IF EXISTS mark_quote_needs_signature();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Change order trigger removed successfully.';
END $$;
