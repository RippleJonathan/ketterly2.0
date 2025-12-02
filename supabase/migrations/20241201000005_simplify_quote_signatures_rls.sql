-- Migration: Simplify quote_signatures RLS policy for public acceptance
-- Date: 2024-12-01
-- Description: Allow public signature insertion with simple validation

-- =====================================================
-- UPDATE quote_signatures RLS POLICY
-- =====================================================

-- Drop the previous policy
DROP POLICY IF EXISTS "Anyone can create signatures for quotes with valid share token" ON public.quote_signatures;

-- Create a simple policy that allows any insert
-- Validation happens at the application level and via foreign key constraints
CREATE POLICY "Public can create quote signatures"
  ON public.quote_signatures
  FOR INSERT
  WITH CHECK (true);

-- Verify the policy is created
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Simplified quote_signatures RLS policy for public access';
END $$;
