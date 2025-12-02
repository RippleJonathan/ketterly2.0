-- =============================================
-- ADD COMPANY REPRESENTATIVE SIGNATURE SUPPORT
-- Adds signer_type field to distinguish customer vs company signatures
-- =============================================

-- 1. Add signer_type column to quote_signatures
ALTER TABLE public.quote_signatures 
ADD COLUMN signer_type TEXT NOT NULL DEFAULT 'customer' CHECK (signer_type IN ('customer', 'company_rep'));

-- 2. Add signer_title column for company reps
ALTER TABLE public.quote_signatures
ADD COLUMN signer_title TEXT;

-- 3. Create index for faster lookups
CREATE INDEX idx_quote_signatures_signer_type ON quote_signatures(signer_type);

-- 4. Add company signature tracking fields to quotes table
ALTER TABLE public.quotes
ADD COLUMN company_signed_by UUID REFERENCES users(id),
ADD COLUMN company_signed_at TIMESTAMPTZ;

-- 5. Update the trigger to only update quote status when BOTH signatures exist
CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  quote_record RECORD;
  customer_signature_exists BOOLEAN;
  company_signature_exists BOOLEAN;
BEGIN
  -- Get quote details
  SELECT * INTO quote_record
  FROM quotes
  WHERE id = NEW.quote_id;
  
  -- Check if both signatures exist
  SELECT EXISTS(
    SELECT 1 FROM quote_signatures 
    WHERE quote_id = NEW.quote_id AND signer_type = 'customer'
  ) INTO customer_signature_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM quote_signatures 
    WHERE quote_id = NEW.quote_id AND signer_type = 'company_rep'
  ) INTO company_signature_exists;
  
  -- If this is a customer signature, mark quote as 'pending_company_signature'
  IF NEW.signer_type = 'customer' THEN
    UPDATE quotes
    SET 
      status = CASE 
        WHEN company_signature_exists THEN 'accepted'
        ELSE 'pending_company_signature'
      END,
      updated_at = NOW()
    WHERE id = NEW.quote_id;
    
    -- Only update lead if both signatures are complete
    IF company_signature_exists THEN
      UPDATE leads
      SET 
        status = 'production',
        quoted_amount = quote_record.total_amount,
        updated_at = NOW()
      WHERE id = quote_record.lead_id;
      
      -- Decline other quotes
      UPDATE quotes
      SET 
        status = 'declined',
        updated_at = NOW()
      WHERE 
        lead_id = quote_record.lead_id
        AND id != NEW.quote_id
        AND status NOT IN ('accepted', 'declined');
    END IF;
  END IF;
  
  -- If this is a company signature, mark quote as 'accepted' if customer already signed
  IF NEW.signer_type = 'company_rep' THEN
    UPDATE quotes
    SET 
      status = CASE 
        WHEN customer_signature_exists THEN 'accepted'
        ELSE 'pending_customer_signature'
      END,
      company_signed_by = (SELECT id FROM users WHERE email = NEW.signer_email LIMIT 1),
      company_signed_at = NEW.signed_at,
      updated_at = NOW()
    WHERE id = NEW.quote_id;
    
    -- Only update lead if both signatures are complete
    IF customer_signature_exists THEN
      UPDATE leads
      SET 
        status = 'production',
        quoted_amount = quote_record.total_amount,
        updated_at = NOW()
      WHERE id = quote_record.lead_id;
      
      -- Decline other quotes
      UPDATE quotes
      SET 
        status = 'declined',
        updated_at = NOW()
      WHERE 
        lead_id = quote_record.lead_id
        AND id != NEW.quote_id
        AND status NOT IN ('accepted', 'declined');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Update quote status constraint to include new intermediate states
ALTER TABLE public.quotes 
DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE public.quotes
ADD CONSTRAINT quotes_status_check 
CHECK (status IN (
  'draft', 
  'sent', 
  'viewed', 
  'pending_customer_signature',
  'pending_company_signature', 
  'accepted', 
  'declined', 
  'expired'
));

-- 7. Create a view for easy signature status lookup
CREATE OR REPLACE VIEW quote_signature_status AS
SELECT 
  q.id AS quote_id,
  q.quote_number,
  q.status,
  EXISTS(
    SELECT 1 FROM quote_signatures qs 
    WHERE qs.quote_id = q.id AND qs.signer_type = 'customer'
  ) AS has_customer_signature,
  EXISTS(
    SELECT 1 FROM quote_signatures qs 
    WHERE qs.quote_id = q.id AND qs.signer_type = 'company_rep'
  ) AS has_company_signature,
  (
    SELECT signed_at FROM quote_signatures qs 
    WHERE qs.quote_id = q.id AND qs.signer_type = 'customer' 
    ORDER BY signed_at DESC LIMIT 1
  ) AS customer_signed_at,
  (
    SELECT signed_at FROM quote_signatures qs 
    WHERE qs.quote_id = q.id AND qs.signer_type = 'company_rep' 
    ORDER BY signed_at DESC LIMIT 1
  ) AS company_signed_at
FROM quotes q;

-- Grant access to the view
GRANT SELECT ON quote_signature_status TO authenticated;
GRANT SELECT ON quote_signature_status TO anon;

COMMENT ON TABLE quote_signatures IS 'Stores both customer and company representative signatures for quotes';
COMMENT ON COLUMN quote_signatures.signer_type IS 'Type of signer: customer or company_rep';
COMMENT ON COLUMN quote_signatures.signer_title IS 'Job title for company representatives (e.g., Project Manager, Sales Rep)';
