-- Migration: Add Quote Signatures and Share Links
-- Created: 2024-12-01
-- Description: Enable e-signature functionality for quotes

-- =============================================
-- ADD SHARE TOKEN TO QUOTES
-- =============================================

-- Add share token and tracking fields to quotes table
ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS share_token_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_link_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_ip_address INET,
  ADD COLUMN IF NOT EXISTS customer_user_agent TEXT;

-- Create index for quick token lookups
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON quotes(share_token) WHERE share_token IS NOT NULL;

-- =============================================
-- QUOTE SIGNATURES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS quote_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Signer information
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_ip_address INET,
  signer_user_agent TEXT,
  
  -- Signature data
  signature_data TEXT NOT NULL, -- base64 encoded image
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contract terms acceptance
  accepted_terms BOOLEAN NOT NULL DEFAULT true,
  terms_version TEXT, -- Track which version of terms was accepted
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT quote_signatures_company_fkey FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT quote_signatures_quote_fkey FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_quote_signatures_quote_id ON quote_signatures(quote_id);
CREATE INDEX idx_quote_signatures_company_id ON quote_signatures(company_id);
CREATE INDEX idx_quote_signatures_signed_at ON quote_signatures(signed_at);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE quote_signatures ENABLE ROW LEVEL SECURITY;

-- Company users can view their own signatures
CREATE POLICY "Users can view their company's quote signatures"
  ON quote_signatures
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Anyone can insert a signature (public quote acceptance)
-- We'll validate the quote_id and company_id in the application
CREATE POLICY "Anyone can create quote signatures"
  ON quote_signatures
  FOR INSERT
  WITH CHECK (true);

-- =============================================
-- FUNCTION: AUTO-UPDATE LEAD STATUS ON QUOTE ACCEPTANCE
-- =============================================

CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  quote_record RECORD;
BEGIN
  -- Get quote details
  SELECT * INTO quote_record
  FROM quotes
  WHERE id = NEW.quote_id;
  
  -- Update quote status to 'accepted'
  UPDATE quotes
  SET 
    status = 'accepted',
    accepted_at = NEW.signed_at,
    updated_at = NOW()
  WHERE id = NEW.quote_id;
  
  -- Update lead status to 'production' (quote accepted, project starting)
  UPDATE leads
  SET 
    status = 'production',
    quoted_amount = quote_record.total_amount,
    updated_at = NOW()
  WHERE id = quote_record.lead_id;
  
  -- If there are other quote options for this lead, mark them as 'declined'
  UPDATE quotes
  SET 
    status = 'declined',
    updated_at = NOW()
  WHERE 
    lead_id = quote_record.lead_id
    AND id != NEW.quote_id
    AND status NOT IN ('accepted', 'declined');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_quote_signature_created ON quote_signatures;
CREATE TRIGGER on_quote_signature_created
  AFTER INSERT ON quote_signatures
  FOR EACH ROW
  EXECUTE FUNCTION handle_quote_acceptance();

-- =============================================
-- FUNCTION: GENERATE SHARE TOKEN
-- =============================================

CREATE OR REPLACE FUNCTION generate_quote_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random token (32 characters)
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(replace(replace(token, '/', ''), '+', ''), '=', '');
    token := substring(token, 1, 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM quotes WHERE share_token = token) INTO token_exists;
    
    -- Exit loop if unique token found
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ADD DEPOSIT PERCENTAGE TO COMPANY SETTINGS
-- =============================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS default_deposit_percentage DECIMAL(5,2) DEFAULT 50.00 CHECK (default_deposit_percentage >= 0 AND default_deposit_percentage <= 100);

COMMENT ON COLUMN companies.default_deposit_percentage IS 'Default percentage for deposit invoices (e.g., 50.00 for 50%)';

-- =============================================
-- UPDATE EXISTING DATA
-- =============================================

-- Set default deposit percentage for existing companies
UPDATE companies 
SET default_deposit_percentage = 50.00 
WHERE default_deposit_percentage IS NULL;
