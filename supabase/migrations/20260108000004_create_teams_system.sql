-- Create Teams System for Multi-Team Structure per Location
-- File: supabase/migrations/20260108000004_create_teams_system.sql

-- Step 1: Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  location_id UUID REFERENCES locations(id) NOT NULL,
  name TEXT NOT NULL,
  team_lead_id UUID REFERENCES users(id),
  commission_rate DECIMAL(5,2) DEFAULT 0,
  paid_when TEXT DEFAULT 'when_final_payment' 
    CHECK (paid_when IN ('when_deposit_paid', 'when_final_payment', 'when_job_completed', 'when_invoice_created')),
  include_own_sales BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Ensure team names are unique per location
  CONSTRAINT unique_team_name_per_location UNIQUE (location_id, name)
);

-- Step 2: Add team_id to location_users
ALTER TABLE location_users 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Step 3: Create index for team membership queries
CREATE INDEX IF NOT EXISTS idx_location_users_team_id ON location_users(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_location_id ON teams(location_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON teams(team_lead_id);

-- Step 4: Add comments for documentation
COMMENT ON TABLE teams IS 'Sales teams within a location. Each team has a team lead (sales_manager) and multiple sales reps.';
COMMENT ON COLUMN teams.team_lead_id IS 'The sales_manager user who leads this team and receives override commission on team sales';
COMMENT ON COLUMN teams.commission_rate IS 'Team lead override commission percentage (e.g., 2.0 for 2%)';
COMMENT ON COLUMN teams.paid_when IS 'When team lead commission is paid: deposit, final payment, job completed, or invoice created';
COMMENT ON COLUMN teams.include_own_sales IS 'If true, team lead gets override commission even on their own sales';
COMMENT ON COLUMN location_users.team_id IS 'The team this user belongs to (if they are a sales rep)';

-- Step 5: Remove the old team_lead_for_location unique constraint (no longer needed)
DROP INDEX IF EXISTS idx_one_team_lead_per_location;

-- Step 6: Create trigger to auto-update updated_at on teams
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_teams_updated_at ON teams;
CREATE TRIGGER trigger_update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Step 7: Create trigger to validate team lead is a sales_manager role
CREATE OR REPLACE FUNCTION validate_team_lead_role()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- If team_lead_id is being set, verify they are a sales_manager
  IF NEW.team_lead_id IS NOT NULL THEN
    SELECT role INTO v_user_role
    FROM users
    WHERE id = NEW.team_lead_id;
    
    IF v_user_role != 'sales_manager' THEN
      RAISE EXCEPTION 'Team lead must have sales_manager role. User has role: %', v_user_role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_team_lead_role ON teams;
CREATE TRIGGER trigger_validate_team_lead_role
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  WHEN (NEW.team_lead_id IS NOT NULL)
  EXECUTE FUNCTION validate_team_lead_role();

-- Step 8: Create function to get team lead for a sales rep
CREATE OR REPLACE FUNCTION get_team_lead_for_sales_rep(p_sales_rep_id UUID)
RETURNS UUID AS $$
DECLARE
  v_team_lead_id UUID;
BEGIN
  -- Find the team lead for the sales rep's team
  SELECT t.team_lead_id INTO v_team_lead_id
  FROM location_users lu
  JOIN teams t ON t.id = lu.team_id
  WHERE lu.user_id = p_sales_rep_id
    AND t.is_active = true
    AND t.deleted_at IS NULL
  LIMIT 1;
  
  RETURN v_team_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Show current teams setup
SELECT 
  l.name as location_name,
  t.name as team_name,
  u.full_name as team_lead_name,
  t.commission_rate,
  t.paid_when,
  t.include_own_sales,
  t.is_active,
  (SELECT COUNT(*) FROM location_users WHERE team_id = t.id) as member_count
FROM teams t
JOIN locations l ON l.id = t.location_id
LEFT JOIN users u ON u.id = t.team_lead_id
WHERE t.deleted_at IS NULL
ORDER BY l.name, t.name;
