-- =============================================
-- Add steep slope tracking columns
-- =============================================
-- Tracks steep pitch roofs (7/12 and higher) separately
-- for pricing and labor calculations
-- =============================================

ALTER TABLE public.lead_measurements
ADD COLUMN IF NOT EXISTS steep_7_12_squares DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS steep_8_12_squares DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS steep_9_12_squares DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS steep_10_12_squares DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS steep_11_12_squares DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS steep_12_plus_squares DECIMAL(10,2);

COMMENT ON COLUMN public.lead_measurements.steep_7_12_squares IS 'Roof area with 7/12 pitch in squares';
COMMENT ON COLUMN public.lead_measurements.steep_8_12_squares IS 'Roof area with 8/12 pitch in squares';
COMMENT ON COLUMN public.lead_measurements.steep_9_12_squares IS 'Roof area with 9/12 pitch in squares';
COMMENT ON COLUMN public.lead_measurements.steep_10_12_squares IS 'Roof area with 10/12 pitch in squares';
COMMENT ON COLUMN public.lead_measurements.steep_11_12_squares IS 'Roof area with 11/12 pitch in squares';
COMMENT ON COLUMN public.lead_measurements.steep_12_plus_squares IS 'Roof area with 12/12+ pitch in squares (very steep)';
