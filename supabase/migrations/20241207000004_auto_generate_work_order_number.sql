-- Auto-generate work order numbers
-- Run this in Supabase SQL Editor

-- Create function to generate work order number
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_order_number TEXT;
BEGIN
  IF NEW.work_order_number IS NULL THEN
    -- Get next number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 'WO-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.work_orders
    WHERE company_id = NEW.company_id
      AND work_order_number ~ '^WO-\d{4}-\d+$';
    
    -- Generate order number: WO-YYYY-001
    new_order_number := 'WO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 3, '0');
    
    NEW.work_order_number := new_order_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate on insert
CREATE TRIGGER auto_generate_work_order_number
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW
  WHEN (NEW.work_order_number IS NULL)
  EXECUTE FUNCTION generate_work_order_number();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_generate_work_order_number';
