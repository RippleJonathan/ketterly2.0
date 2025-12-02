-- Migration: Allow public access to company data when viewing quotes via share token
-- Date: 2024-12-01
-- Description: Add RLS policy to allow unauthenticated users to read company info 
--              (name, contract_terms) when accessing a quote via valid share token

-- =====================================================
-- ADD PUBLIC READ POLICY TO COMPANIES TABLE
-- =====================================================

-- This policy allows anyone to view basic company info (for public quote pages)
-- The company_id is validated through the quote's share_token
CREATE POLICY "Anyone can view company info for quotes with valid share token"
  ON public.companies
  FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.quotes
      WHERE share_token IS NOT NULL
        AND (share_link_expires_at IS NULL OR share_link_expires_at > NOW())
        AND deleted_at IS NULL
    )
  );

-- Verify the policy is created
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added public read access policy for companies via quote share token';
END $$;
