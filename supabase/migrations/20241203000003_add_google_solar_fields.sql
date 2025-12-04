-- =============================================
-- Add Google Solar API Fields to Lead Measurements
-- =============================================
-- Adds fields for storing Google Solar API data
-- and auto-calculated roof complexity metrics
-- =============================================

-- Add new columns for Google Solar API data
ALTER TABLE public.lead_measurements 
  ADD COLUMN IF NOT EXISTS roof_data_raw JSONB,
  ADD COLUMN IF NOT EXISTS roof_pitch TEXT, -- e.g., "6/12", "8/12"
  ADD COLUMN IF NOT EXISTS roof_pitch_degrees DECIMAL(5,2), -- Actual pitch in degrees
  ADD COLUMN IF NOT EXISTS roof_complexity TEXT CHECK (roof_complexity IN ('simple', 'moderate', 'complex')),
  ADD COLUMN IF NOT EXISTS satellite_data_date TIMESTAMPTZ, -- When Google captured the imagery
  ADD COLUMN IF NOT EXISTS measurement_source TEXT DEFAULT 'manual' CHECK (measurement_source IN ('manual', 'google_solar', 'eagleview', 'other'));

-- Add comment to document the fields
COMMENT ON COLUMN public.lead_measurements.roof_data_raw IS 'Full JSON response from Google Solar API for future reference';
COMMENT ON COLUMN public.lead_measurements.roof_pitch IS 'Roof pitch in rise/run format (e.g., "6/12" means 6 inches rise per 12 inches run)';
COMMENT ON COLUMN public.lead_measurements.roof_pitch_degrees IS 'Roof pitch in degrees from Google Solar API';
COMMENT ON COLUMN public.lead_measurements.roof_complexity IS 'Auto-calculated complexity based on number of roof segments: simple (<6), moderate (6-12), complex (>12)';
COMMENT ON COLUMN public.lead_measurements.satellite_data_date IS 'Date when satellite imagery was captured by Google';
COMMENT ON COLUMN public.lead_measurements.measurement_source IS 'Source of the measurement data (manual entry, Google Solar API, EagleView, etc.)';

-- Create index for querying by measurement source
CREATE INDEX IF NOT EXISTS idx_lead_measurements_source ON public.lead_measurements(measurement_source);

-- =============================================
-- Migration Complete
-- =============================================

DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added Google Solar API fields to lead_measurements table';
  RAISE NOTICE 'Fields: roof_data_raw, roof_pitch, roof_pitch_degrees, roof_complexity, satellite_data_date, measurement_source';
END $$;
