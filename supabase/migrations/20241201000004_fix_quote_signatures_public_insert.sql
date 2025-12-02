-- Migration: Fix quote_signatures RLS policy for public quote acceptance
-- Date: 2024-12-01
-- Description: Update RLS policy to allow inserting signatures for quotes with valid share tokens

-- =====================================================
-- UPDATE quote_signatures RLS POLICY
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can create quote signatures" ON public.quote_signatures;

-- Create a more specific policy that validates via quote's share token
-- This allows signature creation only for quotes that have a valid share token
CREATE POLICY "Anyone can create signatures for quotes with valid share token"
  ON public.quote_signatures
  FOR INSERT
  WITH CHECK (
    quote_id IN (
      SELECT id FROM public.quotes
      WHERE share_token IS NOT NULL
        AND (share_link_expires_at IS NULL OR share_link_expires_at > NOW())
        AND deleted_at IS NULL
        AND status IN ('sent', 'viewed')  -- Only allow signing if not already accepted/declined
    )
  );

-- Verify the policy is created
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Updated quote_signatures RLS policy to validate via share token';
END $$;
