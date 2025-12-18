-- Fix materials item_type constraint
-- Ensures the constraint allows the correct values

-- Drop existing constraint if it exists
ALTER TABLE public.materials 
  DROP CONSTRAINT IF EXISTS materials_item_type_check;

-- Add the constraint with correct values
ALTER TABLE public.materials
  ADD CONSTRAINT materials_item_type_check 
  CHECK (item_type IN ('material', 'labor', 'estimate', 'both'));

-- Ensure default value is set
ALTER TABLE public.materials
  ALTER COLUMN item_type SET DEFAULT 'material';
