-- =====================================================================
-- CHANGE ORDERS ENHANCEMENT
-- Link change orders better to quotes and track signatures
-- =====================================================================

-- Add columns to change_orders for better tracking
ALTER TABLE change_orders
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id),
ADD COLUMN IF NOT EXISTS customer_signature_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS company_signature_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create indexes for change order queries
CREATE INDEX IF NOT EXISTS idx_change_orders_quote_id 
ON change_orders(quote_id) 
WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_change_orders_signature_token 
ON change_orders(signature_token) 
WHERE signature_token IS NOT NULL;

-- Update existing change orders to link to quotes based on lead_id
-- This finds the most recent accepted quote for each lead
UPDATE change_orders co
SET quote_id = (
  SELECT q.id
  FROM quotes q
  WHERE q.lead_id = co.lead_id
  AND q.status IN ('accepted', 'approved')
  AND q.deleted_at IS NULL
  ORDER BY q.created_at DESC
  LIMIT 1
)
WHERE co.quote_id IS NULL
AND co.deleted_at IS NULL;

-- Add comments
COMMENT ON COLUMN change_orders.quote_id IS 'The original quote/estimate this change order modifies.';
COMMENT ON COLUMN change_orders.customer_signature_date IS 'When customer signed the change order.';
COMMENT ON COLUMN change_orders.company_signature_date IS 'When company representative signed the change order.';
COMMENT ON COLUMN change_orders.signature_token IS 'Unique token for e-signature link (same as quotes).';
COMMENT ON COLUMN change_orders.pdf_url IS 'URL to the generated change order PDF in storage.';

-- Function to mark quote as needing new signature when change order is approved
CREATE OR REPLACE FUNCTION mark_quote_needs_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- When a change order is created or approved, mark the quote as needing new signature
  IF NEW.status IN ('pending', 'approved') AND NEW.quote_id IS NOT NULL THEN
    UPDATE quotes
    SET needs_new_signature = true
    WHERE id = NEW.quote_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for change orders
DROP TRIGGER IF EXISTS trigger_mark_quote_needs_signature ON change_orders;
CREATE TRIGGER trigger_mark_quote_needs_signature
  AFTER INSERT OR UPDATE OF status ON change_orders
  FOR EACH ROW
  WHEN (NEW.quote_id IS NOT NULL)
  EXECUTE FUNCTION mark_quote_needs_signature();

COMMENT ON FUNCTION mark_quote_needs_signature IS 'Marks quote as needing new signature when change order is created/approved.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Change order enhancements installed successfully.';
END $$;
