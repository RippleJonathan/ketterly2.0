-- =============================================
-- Add flat_squares field for dynamic pitch calculation
-- =============================================
-- flat_squares stores the base measurement without pitch multiplier
-- actual_squares will be auto-calculated as: flat_squares / cos(pitch_radians)
-- This allows users to change pitch and have squares recalculate automatically
-- =============================================

ALTER TABLE public.lead_measurements
ADD COLUMN IF NOT EXISTS flat_squares DECIMAL(10,2);

COMMENT ON COLUMN public.lead_measurements.flat_squares IS 'Flat roof area in squares (no pitch multiplier applied). Used to dynamically calculate actual_squares when pitch changes.';
