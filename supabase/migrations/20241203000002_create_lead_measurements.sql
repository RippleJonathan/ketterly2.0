-- =============================================
-- Lead Measurements Table
-- =============================================
-- Stores roof measurements for leads
-- Used to calculate material quantities and labor estimates
-- =============================================

CREATE TABLE IF NOT EXISTS public.lead_measurements (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Roof measurements
  actual_squares DECIMAL(10,2), -- Actual roof area in squares (1 square = 100 sq ft)
  waste_percentage DECIMAL(5,2) DEFAULT 10.00, -- Waste percentage (typically 10-15%)
  total_squares DECIMAL(10,2), -- Total squares including waste (calculated)
  
  -- Linear measurements (in feet)
  ridge_feet DECIMAL(10,2), -- Ridge line length
  valley_feet DECIMAL(10,2), -- Valley length
  eave_feet DECIMAL(10,2), -- Eave/gutter length
  rake_feet DECIMAL(10,2), -- Rake edge length
  hip_feet DECIMAL(10,2), -- Hip length
  
  -- Additional roof types
  two_story_squares DECIMAL(10,2), -- Two-story roof area in squares
  low_slope_squares DECIMAL(10,2), -- Low-slope roof area in squares
  
  -- Additional measurements
  layers_to_remove INTEGER DEFAULT 1, -- Number of existing roof layers
  pitch_ratio TEXT, -- Roof pitch (e.g., "6/12", "8/12")
  notes TEXT, -- Additional measurement notes
  
  -- Audit fields
  measured_by UUID REFERENCES public.users(id), -- User who took measurements
  measured_at TIMESTAMPTZ DEFAULT NOW(), -- When measurements were taken
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- =============================================
-- Indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_lead_measurements_company_id ON public.lead_measurements(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_measurements_lead_id ON public.lead_measurements(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_measurements_measured_by ON public.lead_measurements(measured_by);
CREATE INDEX IF NOT EXISTS idx_lead_measurements_deleted_at ON public.lead_measurements(deleted_at);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE public.lead_measurements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access measurements for their company's leads
DROP POLICY IF EXISTS "Users can access their company's measurements" ON public.lead_measurements;

CREATE POLICY "Users can access their company's measurements"
  ON public.lead_measurements
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- =============================================
-- Trigger to auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_lead_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_measurements_updated_at ON public.lead_measurements;

CREATE TRIGGER lead_measurements_updated_at
  BEFORE UPDATE ON public.lead_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_measurements_updated_at();

-- =============================================
-- Function to auto-calculate total_squares
-- =============================================

CREATE OR REPLACE FUNCTION calculate_total_squares()
RETURNS TRIGGER AS $$
BEGIN
  -- If actual_squares and waste_percentage are set, calculate total
  IF NEW.actual_squares IS NOT NULL AND NEW.waste_percentage IS NOT NULL THEN
    NEW.total_squares = NEW.actual_squares * (1 + (NEW.waste_percentage / 100));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_measurements_calculate_total ON public.lead_measurements;

CREATE TRIGGER lead_measurements_calculate_total
  BEFORE INSERT OR UPDATE ON public.lead_measurements
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_squares();
