-- Migration: Simplify Material & Work Order Statuses (v2)
-- Date: December 20, 2024
-- Purpose: Reduce status complexity and create clear workflow
-- New statuses: draft, scheduled, completed, paid, cancelled

-- =============================================
-- 1. UPDATE MATERIAL_ORDERS STATUS ENUM
-- =============================================

-- Create new enum type
CREATE TYPE material_order_status AS ENUM ('draft', 'scheduled', 'completed', 'paid', 'cancelled');

-- Drop existing default
ALTER TABLE material_orders ALTER COLUMN status DROP DEFAULT;

-- Drop check constraint if it exists
ALTER TABLE material_orders DROP CONSTRAINT IF EXISTS material_orders_status_check;

-- First, update all the old values to new ones while still TEXT
UPDATE material_orders SET status = 'scheduled' WHERE status IN ('ordered', 'in_transit');
UPDATE material_orders SET status = 'completed' WHERE status IN ('delivered', 'received');

-- Now convert to enum (all values should already match enum values)
ALTER TABLE material_orders 
  ALTER COLUMN status TYPE material_order_status 
  USING status::material_order_status;

-- Set new default
ALTER TABLE material_orders ALTER COLUMN status SET DEFAULT 'draft'::material_order_status;

-- =============================================
-- 2. UPDATE WORK_ORDERS STATUS ENUM
-- =============================================

-- Create new enum type
CREATE TYPE work_order_status AS ENUM ('draft', 'scheduled', 'completed', 'paid', 'cancelled');

-- Drop existing default
ALTER TABLE work_orders ALTER COLUMN status DROP DEFAULT;

-- Drop check constraint if it exists
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- First, update all the old values to new ones while still TEXT
UPDATE work_orders SET status = 'scheduled' WHERE status IN ('sent', 'accepted');
UPDATE work_orders SET status = 'completed' WHERE status = 'in_progress';

-- Now convert to enum (all values should already match enum values)
ALTER TABLE work_orders 
  ALTER COLUMN status TYPE work_order_status 
  USING status::work_order_status;

-- Set new default
ALTER TABLE work_orders ALTER COLUMN status SET DEFAULT 'draft'::work_order_status;

-- =============================================
-- 3. VERIFY MIGRATION
-- =============================================

DO $$
DECLARE
  mo_record RECORD;
  wo_record RECORD;
BEGIN
  -- Show material orders distribution
  RAISE NOTICE 'Material Orders Status Distribution:';
  FOR mo_record IN 
    SELECT status::text as status_name, COUNT(*) as count 
    FROM material_orders 
    WHERE deleted_at IS NULL 
    GROUP BY status
    ORDER BY status
  LOOP
    RAISE NOTICE '  %: %', mo_record.status_name, mo_record.count;
  END LOOP;
  
  -- Show work orders distribution
  RAISE NOTICE 'Work Orders Status Distribution:';
  FOR wo_record IN 
    SELECT status::text as status_name, COUNT(*) as count 
    FROM work_orders 
    WHERE deleted_at IS NULL 
    GROUP BY status
    ORDER BY status
  LOOP
    RAISE NOTICE '  %: %', wo_record.status_name, wo_record.count;
  END LOOP;
  
  RAISE NOTICE '✓ Status migration completed successfully';
END $$;

-- =============================================
-- 4. COMMENTS
-- =============================================

COMMENT ON TYPE material_order_status IS 'Simplified material order statuses: draft (created), scheduled (date set), completed (delivered), paid (invoice paid), cancelled (manually cancelled)';
COMMENT ON TYPE work_order_status IS 'Simplified work order statuses: draft (created), scheduled (date set), completed (work done), paid (invoice paid), cancelled (manually cancelled)';
