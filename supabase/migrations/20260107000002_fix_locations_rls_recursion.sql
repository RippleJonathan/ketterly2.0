-- Fix infinite recursion in locations table RLS policies
-- Issue: The locations table has an RLS policy that's causing infinite recursion during UPDATE
-- This typically happens when a policy references the same table it's protecting

-- First, let's drop all existing policies on locations
DROP POLICY IF EXISTS "Users can view locations in their company" ON locations;
DROP POLICY IF EXISTS "Users can insert locations in their company" ON locations;
DROP POLICY IF EXISTS "Users can update locations in their company" ON locations;
DROP POLICY IF EXISTS "Users can delete locations in their company" ON locations;
DROP POLICY IF EXISTS "Enable read access for all company users" ON locations;
DROP POLICY IF EXISTS "Enable insert access for admins" ON locations;
DROP POLICY IF EXISTS "Enable update access for admins" ON locations;
DROP POLICY IF EXISTS "Enable delete access for admins" ON locations;
DROP POLICY IF EXISTS "location_select_policy" ON locations;
DROP POLICY IF EXISTS "location_insert_policy" ON locations;
DROP POLICY IF EXISTS "location_update_policy" ON locations;
DROP POLICY IF EXISTS "location_delete_policy" ON locations;

-- Re-create clean, non-recursive policies
-- These policies should ONLY reference the users table, not locations recursively

-- SELECT: All company users can view locations
CREATE POLICY "locations_select_policy" 
ON locations FOR SELECT 
USING (
  company_id IN (
    SELECT company_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- INSERT: Only authenticated users can create (company_id will be enforced by FK)
CREATE POLICY "locations_insert_policy" 
ON locations FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND company_id IN (
    SELECT company_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- UPDATE: Only admin or super_admin can update
CREATE POLICY "locations_update_policy" 
ON locations FOR UPDATE 
USING (
  company_id IN (
    SELECT u.company_id 
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  company_id IN (
    SELECT u.company_id 
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
  )
);

-- DELETE: Only admin or super_admin can delete (soft delete)
CREATE POLICY "locations_delete_policy" 
ON locations FOR DELETE 
USING (
  company_id IN (
    SELECT u.company_id 
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
  )
);

-- Verify RLS is enabled
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the fix
COMMENT ON TABLE locations IS 'RLS policies updated to prevent infinite recursion - policies now only reference users table, not locations recursively';
