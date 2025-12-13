-- =====================================================================
-- ESTIMATE-CENTRIC WORKFLOW
-- Add fields to support estimate locking and invoice generation
-- =====================================================================

-- Add new columns to quotes table for estimate workflow
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_new_signature BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

-- Create index for invoice generation queries
CREATE INDEX IF NOT EXISTS idx_quotes_invoice_generated 
ON quotes(invoice_generated_at) 
WHERE invoice_generated_at IS NOT NULL;

-- Update existing signed quotes to be locked
-- Check if quotes have either customer_signed_at or status accepted/approved
UPDATE quotes
SET is_locked = true
WHERE status IN ('accepted', 'approved')
AND deleted_at IS NULL;

-- Add comments explaining the new workflow
COMMENT ON COLUMN quotes.is_locked IS 'TRUE when estimate is signed and should not be edited directly. Changes require a change order.';
COMMENT ON COLUMN quotes.needs_new_signature IS 'TRUE when estimate has been modified after signing and needs customer to re-sign.';
COMMENT ON COLUMN quotes.invoice_generated_at IS 'Timestamp when invoice PDF was generated from this estimate.';
COMMENT ON COLUMN quotes.invoice_pdf_url IS 'URL to the generated invoice PDF in storage.';

-- Create function to auto-lock estimates when signed
CREATE OR REPLACE FUNCTION auto_lock_signed_estimate()
RETURNS TRIGGER AS $$
BEGIN
  -- Lock the estimate when status changes to accepted or approved
  IF NEW.status IN ('accepted', 'approved') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'approved')) THEN
    NEW.is_locked := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-lock estimates
DROP TRIGGER IF EXISTS trigger_auto_lock_estimate ON quotes;
CREATE TRIGGER trigger_auto_lock_estimate
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_lock_signed_estimate();

COMMENT ON FUNCTION auto_lock_signed_estimate IS 'Automatically locks an estimate when customer signs to prevent direct edits.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Estimate locking system installed successfully.';
END $$;
