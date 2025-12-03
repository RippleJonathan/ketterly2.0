-- =============================================
-- Add Two-Story and Low-Slope Columns to Lead Measurements
-- =============================================
-- Adds missing columns that weren't created if table already existed
-- =============================================

-- Add two_story_squares column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lead_measurements' 
    AND column_name = 'two_story_squares'
  ) THEN
    ALTER TABLE public.lead_measurements 
    ADD COLUMN two_story_squares DECIMAL(10,2);
  END IF;
END $$;

-- Add low_slope_squares column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lead_measurements' 
    AND column_name = 'low_slope_squares'
  ) THEN
    ALTER TABLE public.lead_measurements 
    ADD COLUMN low_slope_squares DECIMAL(10,2);
  END IF;
END $$;
