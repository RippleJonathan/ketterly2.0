-- =============================================
-- Migration: Fix measurement_accessories foreign key to materials
-- Created: 2024-12-05
-- Description: Ensures the foreign key relationship exists for Supabase PostgREST queries
-- =============================================

-- First, check if the constraint already exists and drop it if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'measurement_accessories_material_id_fkey'
  ) THEN
    ALTER TABLE public.measurement_accessories 
    DROP CONSTRAINT measurement_accessories_material_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint explicitly
ALTER TABLE public.measurement_accessories
ADD CONSTRAINT measurement_accessories_material_id_fkey
FOREIGN KEY (material_id) 
REFERENCES public.materials(id) 
ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_measurement_accessories_material_id 
ON public.measurement_accessories(material_id);

-- Verify the constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'measurement_accessories_material_id_fkey'
    AND table_name = 'measurement_accessories'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint was not created successfully';
  END IF;
END $$;

COMMENT ON CONSTRAINT measurement_accessories_material_id_fkey 
ON public.measurement_accessories 
IS 'Foreign key to materials table for accessory items';
