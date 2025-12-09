-- Add include_tax field to work_orders
-- Work orders do NOT include tax (unlike material orders which do)
-- This field exists for data consistency but is always set to false for work orders

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS include_tax BOOLEAN DEFAULT false;

-- Set all existing work orders to not include tax
UPDATE public.work_orders SET include_tax = false WHERE include_tax IS NULL;

COMMENT ON COLUMN public.work_orders.include_tax IS 'Work orders do not include tax (always false). Tax is only for material orders.';
