-- Add order_type column to material_orders table
-- This allows us to use the same table for both material and work orders

ALTER TABLE public.material_orders 
ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'material' 
CHECK (order_type IN ('material', 'work'));

-- Add index for filtering by order type
CREATE INDEX IF NOT EXISTS idx_material_orders_order_type ON public.material_orders(order_type);

-- Update existing orders to have 'material' type (default)
UPDATE public.material_orders SET order_type = 'material' WHERE order_type IS NULL;

COMMENT ON COLUMN public.material_orders.order_type IS 'Type of order: material (for materials/supplies) or work (for subcontractors/labor)';
