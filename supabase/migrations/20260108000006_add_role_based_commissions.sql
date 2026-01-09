-- Migration: Add Role-Based Commission Rates and Team Assignment Permissions
-- Created: 2026-01-08
-- Purpose: 
--   1. Add per-user, per-role commission rates (sales, marketing, production)
--   2. Add team assignment permissions to prevent commission fraud

-- =====================================================
-- PART 1: Add Team Assignment Permissions
-- =====================================================

ALTER TABLE public.user_permissions 
ADD COLUMN can_assign_sales_rep BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_assign_sales_manager BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_assign_marketing_rep BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_assign_production_manager BOOLEAN DEFAULT false NOT NULL;

-- Set permissions for existing users based on role defaults
-- Admin and office get all assignment permissions
UPDATE public.user_permissions
SET 
  can_assign_sales_rep = true,
  can_assign_sales_manager = true,
  can_assign_marketing_rep = true,
  can_assign_production_manager = true
WHERE user_id IN (
  SELECT id FROM public.users WHERE role IN ('admin', 'super_admin', 'office')
);

-- Sales managers can only assign sales reps
UPDATE public.user_permissions
SET can_assign_sales_rep = true
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'sales_manager'
);

COMMENT ON COLUMN public.user_permissions.can_assign_sales_rep IS 'Can assign/reassign sales representative on leads';
COMMENT ON COLUMN public.user_permissions.can_assign_sales_manager IS 'Can assign/reassign sales manager on leads';
COMMENT ON COLUMN public.user_permissions.can_assign_marketing_rep IS 'Can assign/reassign marketing representative on leads';
COMMENT ON COLUMN public.user_permissions.can_assign_production_manager IS 'Can assign/reassign production manager on leads';

-- =====================================================
-- PART 2: Add Per-User, Per-Role Commission Rates
-- =====================================================

-- Sales Role Commission
ALTER TABLE public.users 
ADD COLUMN sales_commission_type TEXT CHECK (sales_commission_type IN ('percentage', 'flat_amount')),
ADD COLUMN sales_commission_rate NUMERIC(5,2) CHECK (sales_commission_rate >= 0 AND sales_commission_rate <= 100),
ADD COLUMN sales_flat_amount NUMERIC(10,2) CHECK (sales_flat_amount >= 0);

-- Marketing Role Commission
ALTER TABLE public.users 
ADD COLUMN marketing_commission_type TEXT CHECK (marketing_commission_type IN ('percentage', 'flat_amount')),
ADD COLUMN marketing_commission_rate NUMERIC(5,2) CHECK (marketing_commission_rate >= 0 AND marketing_commission_rate <= 100),
ADD COLUMN marketing_flat_amount NUMERIC(10,2) CHECK (marketing_flat_amount >= 0);

-- Production Role Commission
ALTER TABLE public.users 
ADD COLUMN production_commission_type TEXT CHECK (production_commission_type IN ('percentage', 'flat_amount')),
ADD COLUMN production_commission_rate NUMERIC(5,2) CHECK (production_commission_rate >= 0 AND production_commission_rate <= 100),
ADD COLUMN production_flat_amount NUMERIC(10,2) CHECK (production_flat_amount >= 0);

COMMENT ON COLUMN public.users.sales_commission_type IS 'Commission type when assigned as sales representative';
COMMENT ON COLUMN public.users.sales_commission_rate IS 'Commission percentage (0-100) when assigned as sales rep';
COMMENT ON COLUMN public.users.sales_flat_amount IS 'Flat commission amount when assigned as sales rep';
COMMENT ON COLUMN public.users.marketing_commission_type IS 'Commission type when assigned as marketing representative';
COMMENT ON COLUMN public.users.marketing_commission_rate IS 'Commission percentage (0-100) when assigned as marketing rep';
COMMENT ON COLUMN public.users.marketing_flat_amount IS 'Flat commission amount when assigned as marketing rep';
COMMENT ON COLUMN public.users.production_commission_type IS 'Commission type when assigned as production manager';
COMMENT ON COLUMN public.users.production_commission_rate IS 'Commission percentage (0-100) when assigned as production manager';
COMMENT ON COLUMN public.users.production_flat_amount IS 'Flat commission amount when assigned as production manager';

-- Initialize all existing users to $0 commission (as per requirement)
UPDATE public.users
SET 
  sales_commission_type = 'percentage',
  sales_commission_rate = 0,
  sales_flat_amount = 0,
  marketing_commission_type = 'percentage',
  marketing_commission_rate = 0,
  marketing_flat_amount = 0,
  production_commission_type = 'percentage',
  production_commission_rate = 0,
  production_flat_amount = 0
WHERE 
  sales_commission_type IS NULL
  OR marketing_commission_type IS NULL
  OR production_commission_type IS NULL;

-- =====================================================
-- PART 3: Update Triggers
-- =====================================================

-- Drop and recreate updated_at trigger to handle new columns
DROP TRIGGER IF EXISTS set_timestamp_users ON public.users;
CREATE TRIGGER set_timestamp_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
