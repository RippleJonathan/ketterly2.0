-- Fix the handle_quote_acceptance trigger to run with elevated privileges
-- This bypasses RLS policies that may be checking deleted_at on quotes/leads tables

CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER 
SECURITY DEFINER -- This makes the function run with the privileges of the owner, bypassing RLS
SET search_path = public
AS $$
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

COMMENT ON FUNCTION handle_quote_acceptance() IS 'Automatically updates quote and lead status when a signature is created. Runs with SECURITY DEFINER to bypass RLS policies.';
