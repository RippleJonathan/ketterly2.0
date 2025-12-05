-- =============================================
-- Migration: Add default per_unit values to existing materials
-- Created: 2024-12-05
-- Description: Sets default_per_unit for common roofing materials based on industry standards
-- =============================================

-- Update shingles (typically 3 bundles per square)
UPDATE public.materials
SET 
  default_per_unit = 3.0,
  default_per_square = 3.0
WHERE category = 'shingles' 
  AND measurement_type = 'square'
  AND default_per_unit IS NULL;

-- Update nails (typically 1 box covers 20 squares = 0.05 boxes per square)
UPDATE public.materials
SET 
  default_per_unit = 0.05,
  default_per_square = 0.05
WHERE (name ILIKE '%nail%' OR name ILIKE '%coil%')
  AND measurement_type = 'square'
  AND default_per_unit IS NULL;

-- Update plastic cap nails (typically 1 box covers 20 squares = 0.05 boxes per square)
UPDATE public.materials
SET 
  default_per_unit = 0.05,
  default_per_square = 0.05
WHERE name ILIKE '%plastic%cap%'
  AND measurement_type = 'square'
  AND default_per_unit IS NULL;

-- Update underlayment (typically 1 roll per square for synthetic, varies for felt)
UPDATE public.materials
SET 
  default_per_unit = 1.0,
  default_per_square = 1.0
WHERE (name ILIKE '%underlayment%' OR name ILIKE '%synthetic%')
  AND measurement_type = 'square'
  AND default_per_unit IS NULL;

-- Update ice & water shield (linear feet based)
-- Typically 1 roll covers 33 linear feet
UPDATE public.materials
SET 
  default_per_unit = 33.0,
  default_per_square = 33.0
WHERE (name ILIKE '%ice%water%' OR name ILIKE '%ice%shield%')
  AND measurement_type = 'valley'
  AND default_per_unit IS NULL;

-- Update ridge vent (linear feet based)
-- Typically 1 piece = 4 feet
UPDATE public.materials
SET 
  default_per_unit = 4.0,
  default_per_square = 4.0
WHERE name ILIKE '%ridge%vent%'
  AND measurement_type = 'ridge'
  AND default_per_unit IS NULL;

-- Update drip edge (linear feet based)
-- Typically 1 piece = 10 feet
UPDATE public.materials
SET 
  default_per_unit = 10.0,
  default_per_square = 10.0
WHERE name ILIKE '%drip%edge%'
  AND measurement_type = 'perimeter'
  AND default_per_unit IS NULL;

-- Update vents (each - quantity is the quantity)
UPDATE public.materials
SET 
  default_per_unit = 1.0,
  default_per_square = 1.0
WHERE (name ILIKE '%vent%' OR name ILIKE '%jack%')
  AND measurement_type = 'each'
  AND default_per_unit IS NULL;

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.materials
  WHERE default_per_unit IS NOT NULL;
  
  RAISE NOTICE 'Updated % materials with default_per_unit values', updated_count;
END $$;
