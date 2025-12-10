-- Add is_paid field to material_orders table
-- This tracks whether the order has been paid to the supplier
-- Allows accurate actual profit calculation (money collected vs money paid out)

ALTER TABLE public.material_orders
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

ALTER TABLE public.material_orders
ADD COLUMN IF NOT EXISTS paid_date DATE;

COMMENT ON COLUMN public.material_orders.is_paid IS 'Whether this order has been paid to the supplier';
COMMENT ON COLUMN public.material_orders.paid_date IS 'Date the order was paid to the supplier';

-- Create index for filtering paid/unpaid orders
CREATE INDEX IF NOT EXISTS idx_material_orders_is_paid ON public.material_orders(is_paid) WHERE deleted_at IS NULL;
