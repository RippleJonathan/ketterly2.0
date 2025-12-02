-- Allow company admins to update their own company settings
-- Migration: 20241130000004_allow_admins_update_company.sql

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Super admins can update companies" ON companies;

-- Create new policy that allows admins to update their own company
CREATE POLICY "Admins can update their own company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Also allow admins to update their company with this:
CREATE POLICY "Company admins can update company info"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Drop the first one since the second is more permissive
DROP POLICY IF EXISTS "Admins can update their own company" ON companies;
