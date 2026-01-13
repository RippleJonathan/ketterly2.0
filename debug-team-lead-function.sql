-- Simplified debug function with better error handling
CREATE OR REPLACE FUNCTION debug_team_lead_commission(
  p_lead_id UUID,
  p_invoice_total NUMERIC
)
RETURNS TABLE (
  step TEXT,
  value TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sales_rep_id UUID;
  v_location_id UUID;
  v_team_id UUID;
  v_team_lead_id UUID;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_is_active BOOLEAN;
BEGIN
  -- Step 1: Get lead data using specific fields instead of RECORD
  BEGIN
    SELECT sales_rep_id, location_id 
    INTO v_sales_rep_id, v_location_id
    FROM leads 
    WHERE id = p_lead_id;
    
    IF v_sales_rep_id IS NULL THEN
      RETURN QUERY SELECT 'Error'::TEXT, 'Lead not found or has no sales rep'::TEXT;
      RETURN;
    END IF;
    
    RETURN QUERY SELECT 'Lead Found'::TEXT, 'YES'::TEXT;
    RETURN QUERY SELECT 'Sales Rep ID'::TEXT, v_sales_rep_id::TEXT;
    RETURN QUERY SELECT 'Location ID'::TEXT, COALESCE(v_location_id::TEXT, 'NULL');
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Error in Step 1'::TEXT, SQLERRM::TEXT;
    RETURN;
  END;
  
  -- Step 2: Check location_users
  BEGIN
    SELECT team_id INTO v_team_id
    FROM location_users
    WHERE user_id = v_sales_rep_id
    AND location_id = v_location_id
    LIMIT 1;
    
    IF v_team_id IS NOT NULL THEN
      RETURN QUERY SELECT 'Location User Found'::TEXT, 'YES'::TEXT;
      RETURN QUERY SELECT 'Team ID'::TEXT, v_team_id::TEXT;
    ELSE
      RETURN QUERY SELECT 'Location User Found'::TEXT, 'NO or no team assigned'::TEXT;
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Error in Step 2'::TEXT, SQLERRM::TEXT;
    RETURN;
  END;
  
  -- Step 3: Get team details
  BEGIN
    SELECT team_lead_id, commission_rate, is_active
    INTO v_team_lead_id, v_commission_rate, v_is_active
    FROM teams
    WHERE id = v_team_id;
    
    IF v_team_lead_id IS NULL THEN
      RETURN QUERY SELECT 'Team Found'::TEXT, 'YES but no team lead assigned'::TEXT;
      RETURN;
    END IF;
    
    RETURN QUERY SELECT 'Team Found'::TEXT, 'YES'::TEXT;
    RETURN QUERY SELECT 'Team Lead ID'::TEXT, v_team_lead_id::TEXT;
    RETURN QUERY SELECT 'Commission Rate'::TEXT, COALESCE(v_commission_rate::TEXT, '0') || ' percent'::TEXT;
    RETURN QUERY SELECT 'Is Active'::TEXT, v_is_active::TEXT;
    
    v_commission_amount := p_invoice_total * (COALESCE(v_commission_rate, 0) / 100);
    RETURN QUERY SELECT 'Calculated Amount'::TEXT, '$' || v_commission_amount::TEXT;
    
    IF v_commission_amount > 0 OR v_commission_rate > 0 THEN
      RETURN QUERY SELECT 'Would Create Commission'::TEXT, 'YES'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Would Create Commission'::TEXT, 'NO - Amount is $0'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Error in Step 3'::TEXT, SQLERRM::TEXT;
    RETURN;
  END;
  
  RETURN;
END;
$$;

-- Run the debug function for your lead
SELECT * FROM debug_team_lead_commission(
  'd90a932e-ed35-4229-bd3c-7d3f2747c7ab', -- Your lead ID
  22588.50 -- Your invoice total
);
