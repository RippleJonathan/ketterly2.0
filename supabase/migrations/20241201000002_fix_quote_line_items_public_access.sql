-- Migration: Fix quote_line_items public access via share token
-- Date: 2024-12-01
-- Description: Add RLS policy to allow public access to quote_line_items when viewing via share token

-- =====================================================
-- ADD PUBLIC ACCESS POLICY TO quote_line_items
-- =====================================================

-- Drop existing RLS policies that might block public access
DROP POLICY IF EXISTS "Users can access line items for their company's quotes" ON public.quote_line_items;

-- Create policy for authenticated users to access their company's line items
CREATE POLICY "Users can access line items for their company's quotes"
  ON public.quote_line_items
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM public.quotes
      WHERE company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
  );

-- Create policy for public access via share token
-- This allows anyone to view line items for a quote that has a valid (not expired) share token
CREATE POLICY "Anyone can view line items for quotes with valid share token"
  ON public.quote_line_items
  FOR SELECT
  USING (
    quote_id IN (
      SELECT id FROM public.quotes
      WHERE share_token IS NOT NULL
        AND (share_link_expires_at IS NULL OR share_link_expires_at > NOW())
        AND deleted_at IS NULL
    )
  );

-- Verify the policies are created
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added public access policy for quote_line_items via share token';
END $$;
