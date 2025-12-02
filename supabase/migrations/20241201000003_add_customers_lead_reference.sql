-- Add created_from_lead_id column to customers table
-- This allows tracking which lead a customer was created from

ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS created_from_lead_id UUID REFERENCES leads(id);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_customers_created_from_lead_id 
  ON customers(created_from_lead_id);

-- Add comment
COMMENT ON COLUMN customers.created_from_lead_id IS 'Reference to the lead this customer was created from during quote conversion';
