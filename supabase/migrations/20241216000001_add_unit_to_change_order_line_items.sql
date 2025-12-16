-- =====================================================================
-- Add unit field to change_order_line_items
-- =====================================================================

-- Add unit column to change_order_line_items
ALTER TABLE public.change_order_line_items 
ADD COLUMN unit TEXT DEFAULT 'ea';

COMMENT ON COLUMN public.change_order_line_items.unit IS 'Unit of measurement (e.g., ea, sq ft, bundle, linear ft)';
