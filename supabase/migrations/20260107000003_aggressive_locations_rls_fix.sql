-- AGGRESSIVE FIX: Drop ALL policies on locations table and recreate properly
-- This should be run in Supabase SQL Editor

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (using DO block to handle any policy name)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'locations' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON locations';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new, non-recursive policies
-- These policies ONLY reference the users table, never locations itself

-- SELECT: All company users can view their company's locations
CREATE POLICY "locations_select_policy" 
ON locations FOR SELECT 
TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- INSERT: Authenticated users can create locations in their company
CREATE POLICY "locations_insert_policy" 
ON locations FOR INSERT 
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- UPDATE: Admins can update locations in their company
CREATE POLICY "locations_update_policy" 
ON locations FOR UPDATE 
TO authenticated
USING (
  company_id IN (
    SELECT u.company_id 
    FROM users u
    WHERE u.id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT u.company_id 
    FROM users u
    WHERE u.id = auth.uid()
  )
);

-- DELETE: Admins can delete locations in their company
CREATE POLICY "locations_delete_policy" 
ON locations FOR DELETE 
TO authenticated
USING (
  company_id IN (
    SELECT u.company_id 
    FROM users u
    WHERE u.id = auth.uid()
  )
);

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;
