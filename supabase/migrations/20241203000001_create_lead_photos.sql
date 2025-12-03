-- Lead Photos Table
-- Stores photos uploaded for each lead throughout the project lifecycle

CREATE TABLE IF NOT EXISTS public.lead_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- File information
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  file_type TEXT, -- e.g., 'image/jpeg', 'image/png'
  
  -- Organization
  category TEXT DEFAULT 'general', -- 'before', 'during', 'after', 'damage', 'measurement', 'general'
  caption TEXT, -- Optional description
  
  -- Metadata
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lead_photos_company_id ON public.lead_photos(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lead_photos_lead_id ON public.lead_photos(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lead_photos_category ON public.lead_photos(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_lead_photos_uploaded_at ON public.lead_photos(uploaded_at DESC) WHERE deleted_at IS NULL;

-- Row Level Security
ALTER TABLE public.lead_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access photos from their own company
CREATE POLICY "Users can view their company's lead photos"
  ON public.lead_photos
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lead photos for their company"
  ON public.lead_photos
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's lead photos"
  ON public.lead_photos
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's lead photos"
  ON public.lead_photos
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_lead_photos_updated_at
  BEFORE UPDATE ON public.lead_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.lead_photos IS 'Photos uploaded for leads throughout the project lifecycle (before, during, after)';
COMMENT ON COLUMN public.lead_photos.category IS 'Photo category: before, during, after, damage, measurement, general';
COMMENT ON COLUMN public.lead_photos.file_size IS 'File size in bytes';
