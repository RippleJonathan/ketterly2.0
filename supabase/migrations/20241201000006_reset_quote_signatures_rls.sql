-- Migration: Reset and fix quote_signatures RLS policies
-- Date: 2024-12-01
-- Description: Drop all existing policies and create correct ones for public quote acceptance

-- =====================================================
-- RESET quote_signatures RLS POLICIES
-- =====================================================

-- Drop ALL existing policies on quote_signatures
DROP POLICY IF EXISTS "Users can view their company's quote signatures" ON public.quote_signatures;
DROP POLICY IF EXISTS "Anyone can create quote signatures" ON public.quote_signatures;
DROP POLICY IF EXISTS "Anyone can create signatures for quotes with valid share token" ON public.quote_signatures;
DROP POLICY IF EXISTS "Public can create quote signatures" ON public.quote_signatures;

-- Create SELECT policy for authenticated users
CREATE POLICY "Company users can view their quote signatures"
  ON public.quote_signatures
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Create INSERT policy for public (unauthenticated) users
-- This allows customers to sign quotes via share link
CREATE POLICY "Public can insert quote signatures"
  ON public.quote_signatures
  FOR INSERT
  TO anon  -- Explicitly target anonymous users
  WITH CHECK (true);

-- Create INSERT policy for authenticated users too
CREATE POLICY "Authenticated users can insert quote signatures"
  ON public.quote_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Verify the policies are created
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Reset quote_signatures RLS policies with separate anon and authenticated access';
END $$;
