-- Add signature fields and share token to change_orders table
-- This enables dual-signature workflow (customer + company) similar to quotes

-- Add signature fields
ALTER TABLE public.change_orders
ADD COLUMN IF NOT EXISTS company_signature_data TEXT,
ADD COLUMN IF NOT EXISTS company_signer_name TEXT,
ADD COLUMN IF NOT EXISTS company_signer_title TEXT,
ADD COLUMN IF NOT EXISTS customer_signature_data TEXT,
ADD COLUMN IF NOT EXISTS customer_signer_name TEXT;

-- Add share token fields for email signature links
ALTER TABLE public.change_orders
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS share_token_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS share_link_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Update status constraint to include new statuses
ALTER TABLE public.change_orders
DROP CONSTRAINT IF EXISTS change_orders_status_check;

ALTER TABLE public.change_orders
ADD CONSTRAINT change_orders_status_check 
CHECK (status IN ('pending', 'sent', 'pending_company_signature', 'approved', 'declined', 'cancelled'));

-- Add comments
COMMENT ON COLUMN change_orders.company_signature_data IS 'Base64 encoded signature image for company representative';
COMMENT ON COLUMN change_orders.company_signer_name IS 'Full name of company representative who signed';
COMMENT ON COLUMN change_orders.company_signer_title IS 'Title/position of company signer';
COMMENT ON COLUMN change_orders.customer_signature_data IS 'Base64 encoded signature image for customer';
COMMENT ON COLUMN change_orders.customer_signer_name IS 'Full name of customer who signed';
COMMENT ON COLUMN change_orders.share_token IS 'Unique token for customer signature link';
COMMENT ON COLUMN change_orders.share_token_created_at IS 'When the share token was generated';
COMMENT ON COLUMN change_orders.share_link_expires_at IS 'When the signature link expires';
COMMENT ON COLUMN change_orders.sent_at IS 'When the change order was sent to customer for signature';

-- Create index for share token lookups
CREATE INDEX IF NOT EXISTS idx_change_orders_share_token ON change_orders(share_token) WHERE share_token IS NOT NULL;

-- Create function to generate change order share tokens
CREATE OR REPLACE FUNCTION generate_change_order_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token (32 characters)
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    token := replace(token, '=', '');
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM change_orders WHERE share_token = token) INTO token_exists;
    
    -- If token doesn't exist, return it
    IF NOT token_exists THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
