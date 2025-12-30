-- Add license number to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS license_number TEXT;

-- Add financing options to companies table (simple approach - 3 predefined options)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS financing_option_1_name TEXT DEFAULT 'Standard Financing',
ADD COLUMN IF NOT EXISTS financing_option_1_months INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS financing_option_1_apr DECIMAL(5,2) DEFAULT 7.99,
ADD COLUMN IF NOT EXISTS financing_option_1_enabled BOOLEAN DEFAULT false,

ADD COLUMN IF NOT EXISTS financing_option_2_name TEXT DEFAULT 'Premium Financing',
ADD COLUMN IF NOT EXISTS financing_option_2_months INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS financing_option_2_apr DECIMAL(5,2) DEFAULT 6.99,
ADD COLUMN IF NOT EXISTS financing_option_2_enabled BOOLEAN DEFAULT false,

ADD COLUMN IF NOT EXISTS financing_option_3_name TEXT DEFAULT 'No Interest (Promo)',
ADD COLUMN IF NOT EXISTS financing_option_3_months INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS financing_option_3_apr DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS financing_option_3_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.companies.license_number IS 'Company license/contractor number';
COMMENT ON COLUMN public.companies.financing_option_1_name IS 'Name of first financing option';
COMMENT ON COLUMN public.companies.financing_option_1_months IS 'Term in months for first option';
COMMENT ON COLUMN public.companies.financing_option_1_apr IS 'APR percentage for first option';
COMMENT ON COLUMN public.companies.financing_option_1_enabled IS 'Whether to show first financing option on quotes';
