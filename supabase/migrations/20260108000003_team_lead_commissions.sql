-- Add Team Lead commission fields to location_users
-- File: supabase/migrations/20260108000003_team_lead_commissions.sql

-- Step 1: Add new columns to location_users
ALTER TABLE location_users 
ADD COLUMN IF NOT EXISTS paid_when TEXT DEFAULT 'when_final_payment' 
  CHECK (paid_when IN ('when_deposit_paid', 'when_final_payment', 'when_job_completed', 'when_invoice_created')),
ADD COLUMN IF NOT EXISTS include_own_sales BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS team_lead_for_location BOOLEAN DEFAULT false;

-- Step 2: Create unique constraint - only one team lead per location
CREATE UNIQUE INDEX idx_one_team_lead_per_location 
ON location_users(location_id) 
WHERE team_lead_for_location = true;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN location_users.paid_when IS 'When override commission is paid: deposit, final payment, job completed, or invoice created';
COMMENT ON COLUMN location_users.include_own_sales IS 'If true, user gets override commission even on their own sales (when they are the sales rep)';
COMMENT ON COLUMN location_users.team_lead_for_location IS 'If true, this Sales Manager is THE team lead for this location (only one allowed)';

-- Step 4: Create trigger to auto-clear team_lead status when user role changes away from sales_manager
CREATE OR REPLACE FUNCTION clear_team_lead_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If role changed FROM sales_manager to something else
  IF OLD.role = 'sales_manager' AND NEW.role != 'sales_manager' THEN
    -- Clear team lead status and commissions for this user at all locations
    UPDATE location_users
    SET 
      team_lead_for_location = false,
      commission_enabled = false,
      updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RAISE NOTICE 'User % role changed from sales_manager to %. Cleared team lead status at all locations.', NEW.id, NEW.role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_clear_team_lead_on_role_change ON users;
CREATE TRIGGER trigger_clear_team_lead_on_role_change
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION clear_team_lead_on_role_change();

-- Step 5: Show current location_users with commission settings
SELECT 
  l.name as location_name,
  u.full_name as user_name,
  u.role as user_role,
  lu.commission_enabled,
  lu.commission_type,
  lu.commission_rate,
  lu.flat_commission_amount,
  lu.paid_when,
  lu.include_own_sales,
  lu.team_lead_for_location
FROM location_users lu
JOIN locations l ON l.id = lu.location_id
JOIN users u ON u.id = lu.user_id
ORDER BY l.name, lu.team_lead_for_location DESC, u.full_name;
