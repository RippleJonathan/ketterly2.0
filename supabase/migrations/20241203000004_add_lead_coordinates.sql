-- =============================================
-- Add Latitude/Longitude to Leads Table
-- =============================================
-- Enables geocoding and Google Solar API integration
-- =============================================

-- Add coordinate columns to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Add comment to document the fields
COMMENT ON COLUMN public.leads.latitude IS 'Geocoded latitude for the lead address (-90 to 90)';
COMMENT ON COLUMN public.leads.longitude IS 'Geocoded longitude for the lead address (-180 to 180)';

-- Create index for geospatial queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_leads_coordinates ON public.leads(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =============================================
-- Migration Complete
-- =============================================

DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added latitude and longitude columns to leads table';
END $$;
