-- =============================================
-- COMPREHENSIVE FIX: Update ALL triggers to use 'production' instead of 'won'
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- 1. Fix handle_quote_acceptance() trigger (for quote_signatures table)
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

-- 2. Fix populate_project_fields_from_quote() trigger (for quotes table)
CREATE OR REPLACE FUNCTION populate_project_fields_from_quote()
RETURNS TRIGGER AS $$
DECLARE
  next_project_num INTEGER;
  new_project_number TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 'P-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO next_project_num
    FROM public.leads
    WHERE company_id = NEW.company_id
      AND project_number IS NOT NULL
      AND project_number LIKE 'P-' || TO_CHAR(NOW(), 'YYYY') || '-%';
    
    new_project_number := 'P-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_project_num::TEXT, 3, '0');
    
    UPDATE public.leads 
    SET 
      status = 'production',  -- Changed from 'won' to 'production'
      project_number = new_project_number,
      quoted_amount = NEW.total_amount,
      scope_of_work = NEW.notes,
      updated_at = NOW()
    WHERE id = NEW.lead_id;
    
    -- Skip lead_activities insert if table doesn't exist
    -- INSERT INTO public.lead_activities (...)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Optional: Update any existing leads with status='won' to 'production'
UPDATE leads 
SET status = 'production' 
WHERE status = 'won' 
  AND deleted_at IS NULL;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check handle_quote_acceptance function
SELECT 
  p.proname AS function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%status = ''production''%' THEN '✓ Fixed'
    WHEN pg_get_functiondef(p.oid) LIKE '%status = ''won''%' THEN '✗ Still uses won'
    ELSE '? Unknown'
  END AS status_check
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_quote_acceptance'
  AND n.nspname = 'public';

-- Check populate_project_fields_from_quote function
SELECT 
  p.proname AS function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%status = ''production''%' THEN '✓ Fixed'
    WHEN pg_get_functiondef(p.oid) LIKE '%status = ''won''%' THEN '✗ Still uses won'
    ELSE '? Unknown'
  END AS status_check
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'populate_project_fields_from_quote'
  AND n.nspname = 'public';

-- Check for any leads still using 'won' status
SELECT COUNT(*) as won_leads_count
FROM leads
WHERE status = 'won'
  AND deleted_at IS NULL;
