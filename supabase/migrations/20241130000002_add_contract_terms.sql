-- Add contract terms and conditions field to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS contract_terms TEXT;

-- Add comment
COMMENT ON COLUMN public.companies.contract_terms IS 'Company-specific contract terms and conditions for quotes/contracts';
