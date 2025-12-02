-- Fix RLS policy to use anon role instead of public
DROP POLICY IF EXISTS allow_insert_signatures ON quote_signatures;

CREATE POLICY allow_insert_signatures ON quote_signatures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
