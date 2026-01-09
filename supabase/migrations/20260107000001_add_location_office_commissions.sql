-- Migration: Add Office Role Location-Based Commissions
-- Created: January 7, 2026
-- Description: Adds commission rate fields to location_users table for office roles
--              Allows setting a commission rate (e.g., 0%, 3%) for office roles at each location
--              When leads are created in that location, the office role gets automatic commission

-- =====================================================
-- 1. ADD COMMISSION FIELDS TO location_users
-- =====================================================

ALTER TABLE public.location_users
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat_amount')),
ADD COLUMN IF NOT EXISTS flat_commission_amount DECIMAL(10,2);

-- Add index for querying enabled commission users
CREATE INDEX IF NOT EXISTS idx_location_users_commission_enabled 
  ON location_users(location_id, commission_enabled) 
  WHERE commission_enabled = true;

-- Comments
COMMENT ON COLUMN location_users.commission_rate IS 'Commission rate for this office role at this location (e.g., 3.00 for 3%)';
COMMENT ON COLUMN location_users.commission_enabled IS 'Whether this office role receives commissions for jobs at this location';
COMMENT ON COLUMN location_users.commission_type IS 'Type of commission - percentage of job value or flat amount per job';
COMMENT ON COLUMN location_users.flat_commission_amount IS 'Flat dollar amount if commission_type is flat_amount';

-- =====================================================
-- 2. UPDATE auto_create_commissions FUNCTION (Optional)
-- =====================================================
-- NOTE: This would be handled in application logic (auto-commission.ts)
-- Database trigger would be complex, better to handle in TypeScript

-- =====================================================
-- 3. EXAMPLE QUERIES FOR TESTING
-- =====================================================

-- Find all office roles with commissions enabled at a location
-- SELECT 
--   lu.location_id,
--   l.name as location_name,
--   u.id as user_id,
--   u.full_name,
--   lu.location_role,
--   lu.commission_rate,
--   lu.commission_type,
--   lu.flat_commission_amount
-- FROM location_users lu
-- INNER JOIN users u ON lu.user_id = u.id
-- INNER JOIN locations l ON lu.location_id = l.id
-- WHERE lu.commission_enabled = true
--   AND u.deleted_at IS NULL
--   AND l.deleted_at IS NULL;

-- =====================================================
-- 4. MIGRATION ROLLBACK (if needed)
-- =====================================================

-- To rollback this migration:
-- ALTER TABLE public.location_users
-- DROP COLUMN IF EXISTS commission_rate,
-- DROP COLUMN IF EXISTS commission_enabled,
-- DROP COLUMN IF EXISTS commission_type,
-- DROP COLUMN IF EXISTS flat_commission_amount;
-- 
-- DROP INDEX IF EXISTS idx_location_users_commission_enabled;
