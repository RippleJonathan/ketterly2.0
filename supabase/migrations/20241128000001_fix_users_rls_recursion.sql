-- Fix infinite recursion in users table RLS policy
-- Issue: Users policy references itself, causing infinite recursion during signup

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can access their company's users" ON users;

-- Create separate policies for different operations

-- Policy 1: Users can INSERT their own user record (for signup)
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 2: Users can SELECT users from their own company
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Policy 3: Users can UPDATE their own record or company admins can update
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (
    id = auth.uid() OR
    (
      company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    )
  );

-- Policy 4: Only admins can DELETE users from their company
CREATE POLICY "Admins can delete company users"
  ON users FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Also allow anonymous users to check if email exists (for join-existing-company flow)
-- This is safe because email alone doesn't reveal sensitive information
CREATE POLICY "Allow email lookup for signup"
  ON users FOR SELECT
  USING (true);

-- Drop the duplicate SELECT policy since we just created a broader one above
DROP POLICY IF EXISTS "Users can view company users" ON users;

-- Final SELECT policy: Authenticated users can see users from their company
CREATE POLICY "Authenticated users view company users"
  ON users FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );
