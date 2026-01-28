-- Migration: Add "Paid When" Settings for Role-Based Commissions
-- Created: 2026-01-28
-- Purpose: Add paid_when columns for each role type (sales, marketing, production)
--          so users can configure when their commissions become available

-- Add paid_when columns for each role
ALTER TABLE public.users 
ADD COLUMN sales_paid_when TEXT CHECK (sales_paid_when IN ('when_deposit_paid', 'when_job_completed', 'when_final_payment', 'custom')) DEFAULT 'when_final_payment',
ADD COLUMN marketing_paid_when TEXT CHECK (marketing_paid_when IN ('when_deposit_paid', 'when_job_completed', 'when_final_payment', 'custom')) DEFAULT 'when_final_payment',
ADD COLUMN production_paid_when TEXT CHECK (production_paid_when IN ('when_deposit_paid', 'when_job_completed', 'when_final_payment', 'custom')) DEFAULT 'when_final_payment';

-- Add comments
COMMENT ON COLUMN public.users.sales_paid_when IS 'When sales commission becomes available for payment';
COMMENT ON COLUMN public.users.marketing_paid_when IS 'When marketing commission becomes available for payment';
COMMENT ON COLUMN public.users.production_paid_when IS 'When production commission becomes available for payment';

-- Initialize existing users to default value
UPDATE public.users
SET 
  sales_paid_when = COALESCE(sales_paid_when, 'when_final_payment'),
  marketing_paid_when = COALESCE(marketing_paid_when, 'when_final_payment'),
  production_paid_when = COALESCE(production_paid_when, 'when_final_payment')
WHERE 
  sales_paid_when IS NULL 
  OR marketing_paid_when IS NULL 
  OR production_paid_when IS NULL;
