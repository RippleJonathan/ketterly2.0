-- Allow location_admin users to create users for their managed locations
-- Part of hierarchical permission model implementation

-- Drop existing UPDATE policy to recreate with location admin permissions
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- Recreate UPDATE policy: Users can update their own record, admins can update company users, office/location admins can update their location team
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (
    id = auth.uid() OR
    -- Company admins (admin/super_admin only) can update all company users
    (
      company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    ) OR
    -- Office users and location admins can update users in their managed locations
    (
      id IN (
        SELECT DISTINCT lu.user_id
        FROM location_users lu
        WHERE lu.location_id IN (
          SELECT location_id 
          FROM location_users 
          WHERE user_id = auth.uid() AND (location_role = 'location_admin' OR 
            (SELECT role FROM users WHERE id = auth.uid()) = 'office')
        )
      )
    )
  );

-- Add policy to allow location admins to create users
-- Note: User creation happens via server-side API (admin client) but this policy ensures location admins
-- can perform user-related operations through the app

-- Drop existing admin-only DELETE policy
DROP POLICY IF EXISTS "Admins can delete company users" ON users;

-- Recreate DELETE policy: Admins, office users, and location admins can delete/deactivate users
CREATE POLICY "Admins can delete company users"
  ON users FOR DELETE
  USING (
    -- Company admins (admin/super_admin only) can delete all company users
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) OR
    -- Office users and location admins can delete users in their managed locations
    id IN (
      SELECT DISTINCT lu.user_id
      FROM location_users lu
      WHERE lu.location_id IN (
        SELECT location_id 
        FROM location_users 
        WHERE user_id = auth.uid() AND (location_role = 'location_admin' OR 
          (SELECT role FROM users WHERE id = auth.uid()) = 'office')
      )
    )
  );

-- Add comment explaining the permission model
COMMENT ON TABLE users IS 'Users table with hierarchical permissions: admin/super_admin manage all company users, office users manage their assigned location teams, regular users see only their location data';
