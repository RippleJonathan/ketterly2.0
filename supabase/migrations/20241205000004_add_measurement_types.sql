-- =====================================================
-- Add Measurement Type Support
-- =====================================================
-- Adds ability to specify different measurement types for materials
-- (squares, hip_ridge, perimeter, etc.) instead of only per_square
-- Created: 2024-12-05
-- =====================================================

-- =====================================================
-- STEP 1: Add measurement_type to materials table
-- =====================================================

-- Add new column for measurement type
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'square' 
CHECK (measurement_type IN ('square', 'hip_ridge', 'perimeter', 'ridge', 'valley', 'rake', 'eave', 'each'));

-- Rename default_per_square to default_per_unit for clarity
-- (We'll keep both during transition, then remove default_per_square later)
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS default_per_unit NUMERIC(10,2);

-- Copy existing default_per_square values to default_per_unit
UPDATE public.materials 
SET default_per_unit = default_per_square 
WHERE default_per_square IS NOT NULL AND default_per_unit IS NULL;

COMMENT ON COLUMN public.materials.measurement_type IS 'What measurement this material is calculated from: square (default), hip_ridge (combined hip+ridge feet), perimeter (rake+eave feet), ridge, valley, rake, eave, or each (fixed quantity)';
COMMENT ON COLUMN public.materials.default_per_unit IS 'Default quantity per measurement unit (e.g., 3.0 bundles per square, or 1.0 bundle per 33 linear feet of ridge)';

-- =====================================================
-- STEP 2: Template materials use material's conversion settings
-- =====================================================
-- Note: We do NOT add measurement_type or per_unit to template_materials
-- Templates will inherit these from the material itself
-- This prevents conflicts and maintains single source of truth

-- Make per_square nullable and drop constraint (single source of truth)
ALTER TABLE public.template_materials 
ALTER COLUMN per_square DROP NOT NULL;

-- Drop the positive check constraint on per_square
ALTER TABLE public.template_materials 
DROP CONSTRAINT IF EXISTS template_materials_per_square_positive;

COMMENT ON COLUMN public.template_materials.per_square IS 'DEPRECATED: Use material.default_per_unit instead. Kept for backward compatibility only.';

-- =====================================================
-- STEP 3: Add calculated measurement fields to lead_measurements
-- =====================================================

-- Add computed fields for common measurement combinations
ALTER TABLE public.lead_measurements 
ADD COLUMN IF NOT EXISTS hip_ridge_total NUMERIC(10,2) GENERATED ALWAYS AS (
  COALESCE(hip_feet, 0) + COALESCE(ridge_feet, 0)
) STORED;

ALTER TABLE public.lead_measurements 
ADD COLUMN IF NOT EXISTS perimeter_total NUMERIC(10,2) GENERATED ALWAYS AS (
  COALESCE(rake_feet, 0) + COALESCE(eave_feet, 0)
) STORED;

CREATE INDEX IF NOT EXISTS idx_lead_measurements_hip_ridge_total ON public.lead_measurements(hip_ridge_total);
CREATE INDEX IF NOT EXISTS idx_lead_measurements_perimeter_total ON public.lead_measurements(perimeter_total);

COMMENT ON COLUMN public.lead_measurements.hip_ridge_total IS 'Total hip + ridge linear feet (auto-calculated)';
COMMENT ON COLUMN public.lead_measurements.perimeter_total IS 'Total rake + eave linear feet / perimeter (auto-calculated)';

-- =====================================================
-- STEP 4: Create helper function to calculate material quantity
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_material_quantity(
  p_measurement_type TEXT,
  p_per_unit NUMERIC,
  p_squares NUMERIC,
  p_hip_ridge NUMERIC,
  p_perimeter NUMERIC,
  p_ridge NUMERIC,
  p_valley NUMERIC,
  p_rake NUMERIC,
  p_eave NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  CASE p_measurement_type
    WHEN 'square' THEN
      RETURN p_squares * p_per_unit;
    WHEN 'hip_ridge' THEN
      RETURN (p_hip_ridge / p_per_unit); -- e.g., 100 LF / 33 LF per bundle = 3.03 bundles
    WHEN 'perimeter' THEN
      RETURN (p_perimeter / p_per_unit);
    WHEN 'ridge' THEN
      RETURN (p_ridge / p_per_unit);
    WHEN 'valley' THEN
      RETURN (p_valley / p_per_unit);
    WHEN 'rake' THEN
      RETURN (p_rake / p_per_unit);
    WHEN 'eave' THEN
      RETURN (p_eave / p_per_unit);
    WHEN 'each' THEN
      RETURN p_per_unit; -- Fixed quantity (e.g., always 1 drip edge coil)
    ELSE
      RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_material_quantity IS 'Calculates material quantity based on measurement type and roof measurements. For square: qty = squares * per_unit. For linear (hip_ridge, perimeter, etc): qty = feet / per_unit. For each: qty = per_unit (fixed).';

-- =====================================================
-- STEP 5: Add example materials with different measurement types
-- =====================================================

-- Example: Update some materials to use different measurement types
-- (This is just for demonstration - you'll set these in the UI)

-- Ridge cap shingles use hip_ridge measurement
-- UPDATE public.materials 
-- SET measurement_type = 'hip_ridge',
--     default_per_unit = 33.0, -- 33 linear feet per bundle
--     notes = 'Covers 33 linear feet per bundle'
-- WHERE name ILIKE '%ridge cap%' OR name ILIKE '%hip ridge%';

-- Drip edge uses perimeter
-- UPDATE public.materials 
-- SET measurement_type = 'perimeter',
--     default_per_unit = 10.0, -- 10 feet per piece
--     notes = 'Each piece is 10 feet long'
-- WHERE name ILIKE '%drip edge%';

-- Starter strip uses perimeter  
-- UPDATE public.materials 
-- SET measurement_type = 'perimeter',
--     default_per_unit = 100.0, -- Coverage per roll/bundle
--     notes = 'Covers 100 linear feet'
-- WHERE name ILIKE '%starter%';

-- =====================================================
-- STEP 6: Update material order calculation views
-- =====================================================

-- Drop existing view if it exists (so we can recreate with new column references)
DROP VIEW IF EXISTS material_order_calculations;

-- Add view to help calculate material orders from templates
CREATE OR REPLACE VIEW material_order_calculations AS
SELECT 
  tm.id as template_material_id,
  tm.template_id,
  tm.material_id,
  m.name as material_name,
  m.category,
  m.unit,
  m.measurement_type,  -- From material, not template
  m.default_per_unit,  -- From material, not template
  tm.description,
  
  -- For reference: what measurements are needed
  CASE m.measurement_type
    WHEN 'square' THEN 'Requires: total_squares'
    WHEN 'hip_ridge' THEN 'Requires: hip_feet + ridge_feet'
    WHEN 'perimeter' THEN 'Requires: rake_feet + eave_feet'
    WHEN 'ridge' THEN 'Requires: ridge_feet'
    WHEN 'valley' THEN 'Requires: valley_feet'
    WHEN 'rake' THEN 'Requires: rake_feet'
    WHEN 'eave' THEN 'Requires: eave_feet'
    WHEN 'each' THEN 'Fixed quantity'
    ELSE 'Unknown'
  END as measurement_required
  
FROM public.template_materials tm
JOIN public.materials m ON tm.material_id = m.id
WHERE tm.template_id IS NOT NULL
  AND m.deleted_at IS NULL
ORDER BY tm.sort_order;

COMMENT ON VIEW material_order_calculations IS 'Helper view showing what measurements are needed for each template material';

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this migration:
-- 1. Update materials in UI to set correct measurement_type
-- 2. Update template_materials to set correct per_unit values
-- 3. Use calculate_material_quantity() function when generating orders
-- =====================================================
