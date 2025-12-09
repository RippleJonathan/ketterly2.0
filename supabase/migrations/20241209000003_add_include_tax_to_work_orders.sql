-- Add include_tax field to work_orders
-- This controls whether tax should be displayed on the work order PDF and calculated in totals

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS include_tax BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.work_orders.include_tax IS 'Whether to include tax in the work order total and display on PDF (default: true)';
