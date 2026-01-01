 -- Fix RLS policy for office users to update users in their managed locations
-- The previous policy had a complex subquery that might not work correctly

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- Recreate UPDATE policy with simplified logic
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (
    -- Users can update their own record
    id = auth.uid() 
    OR
    -- Company admins (admin/super_admin) can update all company users
    (
      company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    )
    OR
    -- Office users (role = 'office') can update users in their managed locations
    (
      EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'office'
        AND u.company_id = users.company_id
      )
      AND id IN (
        SELECT DISTINCT lu.user_id
        FROM location_users lu
        WHERE lu.location_id IN (
          SELECT location_id 
          FROM location_users 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Update DELETE policy as well for consistency
DROP POLICY IF EXISTS "Admins can delete company users" ON users;

CREATE POLICY "Admins can delete company users"
  ON users FOR DELETE
  USING (
    -- Company admins (admin/super_admin) can delete all company users
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR
    -- Office users can delete users in their managed locations
    (
      EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'office'
        AND u.company_id = users.company_id
      )
      AND id IN (
        SELECT DISTINCT lu.user_id
        FROM location_users lu
        WHERE lu.location_id IN (
          SELECT location_id 
          FROM location_users 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

COMMENT ON POLICY "Users can update own record" ON users IS 'Users can update their own record. Admins can update all company users. Office users can update users in their managed locations.';

COMMENT ON POLICY "Admins can delete company users" ON users IS 'Admins can delete all company users. Office users can delete users in their managed locations.';
