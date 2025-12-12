-- Add paid_amount column to track partial payments on commissions
-- This allows us to handle cases where commission amount increases after partial payment

ALTER TABLE public.lead_commissions
ADD COLUMN paid_amount NUMERIC DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN public.lead_commissions.paid_amount IS 'Total amount already paid out for this commission (for handling partial payments when commission amount changes)';

-- Update existing paid commissions to set paid_amount = calculated_amount
UPDATE public.lead_commissions
SET paid_amount = calculated_amount
WHERE status = 'paid' AND paid_amount = 0;

-- Add constraint to ensure paid_amount doesn't exceed calculated_amount
ALTER TABLE public.lead_commissions
ADD CONSTRAINT paid_amount_not_exceed_calculated 
CHECK (paid_amount <= calculated_amount);

-- Create function to calculate remaining amount owed
CREATE OR REPLACE FUNCTION get_commission_balance(commission_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  calculated NUMERIC;
  paid NUMERIC;
BEGIN
  SELECT calculated_amount, paid_amount 
  INTO calculated, paid
  FROM lead_commissions
  WHERE id = commission_id;
  
  RETURN calculated - paid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_commission_balance IS 'Calculate remaining balance owed on a commission after partial payments';
