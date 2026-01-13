-- Fix handle_quote_acceptance to NOT reference NEW.total_amount
-- NEW refers to quote_signatures record, which doesn't have total_amount
-- This should reference quote_record.total_amount instead

CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
BEGIN
  -- Get quote details (NEW is the quote_signatures record, not quotes!)
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
    quoted_amount = quote_record.total_amount,  -- Use quote_record, NOT NEW
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

COMMENT ON FUNCTION handle_quote_acceptance() IS 'Automatically updates quote and lead status when a signature is created. Runs with SECURITY DEFINER to bypass RLS policies. NEW refers to quote_signatures record.';
