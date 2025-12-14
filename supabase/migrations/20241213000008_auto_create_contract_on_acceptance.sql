-- =====================================================================
-- AUTO-CREATE CONTRACT SNAPSHOT ON QUOTE ACCEPTANCE
-- When both customer and company signatures exist, create contract snapshot
-- =====================================================================

-- Update the handle_quote_acceptance function to create contract snapshots
CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  quote_record RECORD;
  customer_signature_exists BOOLEAN;
  company_signature_exists BOOLEAN;
  customer_sig RECORD;
  company_sig RECORD;
  new_contract_id UUID;
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
  
  -- If this is a customer signature
  IF NEW.signer_type = 'customer' THEN
    UPDATE quotes
    SET 
      status = CASE 
        WHEN company_signature_exists THEN 'accepted'
        ELSE 'pending_company_signature'
      END,
      updated_at = NOW()
    WHERE id = NEW.quote_id;
    
    -- If both signatures are complete, create contract and update lead
    IF company_signature_exists THEN
      -- Get signature details
      SELECT * INTO customer_sig
      FROM quote_signatures
      WHERE quote_id = NEW.quote_id AND signer_type = 'customer'
      ORDER BY signed_at DESC
      LIMIT 1;
      
      SELECT * INTO company_sig
      FROM quote_signatures
      WHERE quote_id = NEW.quote_id AND signer_type = 'company_rep'
      ORDER BY signed_at DESC
      LIMIT 1;
      
      -- Create contract snapshot
      SELECT create_contract_from_quote(
        NEW.quote_id,
        customer_sig.signed_at,
        customer_sig.signature_data,
        customer_sig.signer_name,
        customer_sig.signer_ip_address,
        company_sig.signed_at,
        company_sig.signature_data,
        company_sig.signer_name
      ) INTO new_contract_id;
      
      RAISE NOTICE 'Contract snapshot created: %', new_contract_id;
      
      -- Update lead
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
  
  -- If this is a company signature
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
    
    -- If both signatures are complete, create contract and update lead
    IF customer_signature_exists THEN
      -- Get signature details
      SELECT * INTO customer_sig
      FROM quote_signatures
      WHERE quote_id = NEW.quote_id AND signer_type = 'customer'
      ORDER BY signed_at DESC
      LIMIT 1;
      
      SELECT * INTO company_sig
      FROM quote_signatures
      WHERE quote_id = NEW.quote_id AND signer_type = 'company_rep'
      ORDER BY signed_at DESC
      LIMIT 1;
      
      -- Create contract snapshot
      SELECT create_contract_from_quote(
        NEW.quote_id,
        customer_sig.signed_at,
        customer_sig.signature_data,
        customer_sig.signer_name,
        customer_sig.signer_ip_address,
        company_sig.signed_at,
        company_sig.signature_data,
        company_sig.signer_name
      ) INTO new_contract_id;
      
      RAISE NOTICE 'Contract snapshot created: %', new_contract_id;
      
      -- Update lead
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

-- Add comment
COMMENT ON FUNCTION handle_quote_acceptance IS 'Manages quote status based on customer and company signatures. Creates contract snapshot when BOTH signatures exist. Updates lead status to production.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Auto-create contract on acceptance installed successfully.';
  RAISE NOTICE 'Contracts will be created automatically when both customer and company sign.';
END $$;
