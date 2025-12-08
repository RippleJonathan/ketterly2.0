-- Add item_type field to materials table for filtering labor vs material items
-- Run this in Supabase SQL Editor

-- Add item_type column
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'material'
  CHECK (item_type IN ('material', 'labor', 'estimate', 'both'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_materials_item_type 
  ON public.materials(item_type) 
  WHERE is_active = true AND deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN public.materials.item_type IS 
  'Type of item: material (for material orders), labor (for work orders), estimate (for estimates/quotes), or both (all contexts)';

-- Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'materials' 
  AND column_name = 'item_type';
