-- =============================================
-- Migration: Add tax rate to companies
-- Created: 2024-12-05
-- Description: Adds sales tax rate field for material order calculations
-- =============================================

-- Add tax_rate column to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.0000;

COMMENT ON COLUMN public.companies.tax_rate IS 'Sales tax rate as decimal (e.g., 0.0825 for 8.25%)';

-- Set default tax rates by state (you can adjust these)
-- Example: California = 7.25%
UPDATE public.companies
SET tax_rate = 0.0725
WHERE state = 'CA' AND tax_rate = 0;

-- Example: Texas = 6.25%
UPDATE public.companies
SET tax_rate = 0.0625
WHERE state = 'TX' AND tax_rate = 0;

-- Example: Florida = 6%
UPDATE public.companies
SET tax_rate = 0.06
WHERE state = 'FL' AND tax_rate = 0;

-- Add tax fields to material_orders table
ALTER TABLE public.material_orders
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_with_tax DECIMAL(10,2) DEFAULT 0.00;

COMMENT ON COLUMN public.material_orders.tax_rate IS 'Tax rate applied to this order';
COMMENT ON COLUMN public.material_orders.tax_amount IS 'Calculated tax amount';
COMMENT ON COLUMN public.material_orders.total_with_tax IS 'Total including tax';
