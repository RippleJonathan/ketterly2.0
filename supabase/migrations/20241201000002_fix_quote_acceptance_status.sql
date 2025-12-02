-- =============================================
-- FIX: Update handle_quote_acceptance trigger
-- Change lead status from 'won' to 'production'
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
