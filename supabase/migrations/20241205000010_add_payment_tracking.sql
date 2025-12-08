-- Migration: Add payment tracking and pickup option to material orders
-- Created: 2024-12-05
-- Description: Track payments and pickup/delivery method for material orders

-- Add payment tracking columns
ALTER TABLE public.material_orders
ADD COLUMN IF NOT EXISTS is_pickup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN (
  'cash',
  'check',
  'credit_card',
  'wire_transfer',
  'company_account',
  'other'
)),
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Comment
COMMENT ON COLUMN public.material_orders.is_pickup IS 'True if order will be picked up instead of delivered';
COMMENT ON COLUMN public.material_orders.is_paid IS 'True if order has been paid for';
COMMENT ON COLUMN public.material_orders.payment_date IS 'Date payment was made';
COMMENT ON COLUMN public.material_orders.payment_amount IS 'Amount paid (may differ from total if partial payment)';
COMMENT ON COLUMN public.material_orders.payment_method IS 'Method used for payment';
COMMENT ON COLUMN public.material_orders.payment_notes IS 'Additional notes about payment';
