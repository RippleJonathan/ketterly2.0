-- =============================================
-- KETTERLY CRM - PRESENTATION SYSTEM
-- =============================================
-- Created: 2024-12-25
-- Purpose: Sales presentation builder with dynamic slides and interactive pricing

-- =============================================
-- PRESENTATION TEMPLATES TABLE
-- =============================================
-- Stores presentation template configurations (Retail vs Insurance flows)
CREATE TABLE IF NOT EXISTS public.presentation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  
  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('retail', 'insurance', 'both')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- PRESENTATION SLIDES TABLE
-- =============================================
-- Individual slides within a presentation template
CREATE TABLE IF NOT EXISTS public.presentation_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES presentation_templates(id) ON DELETE CASCADE NOT NULL,
  
  -- Slide Info
  title TEXT,
  slide_order INTEGER NOT NULL,
  slide_type TEXT NOT NULL CHECK (slide_type IN (
    'static',           -- Static content (images/text)
    'dynamic_pricing',  -- Interactive Good/Better/Best grid
    'customer_info',    -- Dynamic customer data
    'measurement_data', -- Roof measurements
    'company_info',     -- Company details
    'photo_gallery',    -- Photo slideshow
    'video',            -- Video embed
    'closing'           -- Final slide with CTA
  )),
  
  -- Content (JSONB for flexibility)
  content JSONB DEFAULT '{}'::jsonb,
  
  -- Conditional Display
  show_for_retail BOOLEAN DEFAULT true NOT NULL,
  show_for_insurance BOOLEAN DEFAULT true NOT NULL,
  requires_estimates BOOLEAN DEFAULT false NOT NULL,
  
  -- Action Button Configuration
  action_button_enabled BOOLEAN DEFAULT false NOT NULL,
  action_button_label TEXT,
  action_button_type TEXT CHECK (action_button_type IN (
    'trigger_contract',
    'trigger_contingency',
    'link_external',
    'next_slide'
  )),
  action_button_config JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PRESENTATION MEDIA TABLE
-- =============================================
-- Uploaded images/videos for presentations
CREATE TABLE IF NOT EXISTS public.presentation_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  
  -- Media Info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  mime_type TEXT,
  file_size INTEGER,
  
  -- Usage tracking
  used_in_slides UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- PRESENTATION SESSIONS TABLE
-- =============================================
-- Track active presentations and selections
CREATE TABLE IF NOT EXISTS public.presentation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  template_id UUID REFERENCES presentation_templates(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  
  -- Session Data
  flow_type TEXT NOT NULL CHECK (flow_type IN ('retail', 'insurance')),
  selected_estimate_id UUID, -- References quotes table
  selected_option TEXT, -- 'good', 'better', 'best'
  
  -- Compiled Deck (snapshot at presentation time)
  deck_data JSONB,
  
  -- Session Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  completed_at TIMESTAMPTZ,
  contract_signed BOOLEAN DEFAULT false,
  
  -- Metadata
  presented_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE presentation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_sessions ENABLE ROW LEVEL SECURITY;

-- Presentation Templates Policies
CREATE POLICY "Users can view their company's presentation templates"
  ON presentation_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create presentation templates for their company"
  ON presentation_templates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's presentation templates"
  ON presentation_templates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's presentation templates"
  ON presentation_templates FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Presentation Slides Policies
CREATE POLICY "Users can view slides from their company's templates"
  ON presentation_slides FOR SELECT
  USING (template_id IN (
    SELECT id FROM presentation_templates 
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can create slides in their company's templates"
  ON presentation_slides FOR INSERT
  WITH CHECK (template_id IN (
    SELECT id FROM presentation_templates 
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can update slides in their company's templates"
  ON presentation_slides FOR UPDATE
  USING (template_id IN (
    SELECT id FROM presentation_templates 
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users can delete slides from their company's templates"
  ON presentation_slides FOR DELETE
  USING (template_id IN (
    SELECT id FROM presentation_templates 
    WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  ));

-- Presentation Media Policies
CREATE POLICY "Users can view their company's presentation media"
  ON presentation_media FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can upload presentation media for their company"
  ON presentation_media FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's presentation media"
  ON presentation_media FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company's presentation media"
  ON presentation_media FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Presentation Sessions Policies
CREATE POLICY "Users can view their company's presentation sessions"
  ON presentation_sessions FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create presentation sessions for their company"
  ON presentation_sessions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company's presentation sessions"
  ON presentation_sessions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_presentation_templates_company ON presentation_templates(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_presentation_templates_flow_type ON presentation_templates(flow_type) WHERE is_active = true;

CREATE INDEX idx_presentation_slides_template ON presentation_slides(template_id);
CREATE INDEX idx_presentation_slides_order ON presentation_slides(template_id, slide_order);
CREATE INDEX idx_presentation_slides_type ON presentation_slides(slide_type);

CREATE INDEX idx_presentation_media_company ON presentation_media(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_presentation_media_type ON presentation_media(file_type);

CREATE INDEX idx_presentation_sessions_lead ON presentation_sessions(lead_id);
CREATE INDEX idx_presentation_sessions_status ON presentation_sessions(status);
CREATE INDEX idx_presentation_sessions_company ON presentation_sessions(company_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get compiled presentation deck
CREATE OR REPLACE FUNCTION get_presentation_deck(
  p_template_id UUID,
  p_lead_id UUID,
  p_flow_type TEXT,
  p_estimate_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deck JSONB;
  v_customer_data JSONB;
  v_estimate_data JSONB;
BEGIN
  -- Get customer data
  SELECT jsonb_build_object(
    'name', full_name,
    'email', email,
    'phone', phone,
    'address', address,
    'city', city,
    'state', state,
    'zip', zip
  ) INTO v_customer_data
  FROM leads
  WHERE id = p_lead_id;

  -- Get estimate data if provided
  IF p_estimate_ids IS NOT NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'quote_number', quote_number,
        'subtotal', subtotal,
        'tax', tax_amount,
        'total', total_amount,
        'line_items', line_items
      )
    ) INTO v_estimate_data
    FROM quotes
    WHERE id = ANY(p_estimate_ids);
  END IF;

  -- Build the deck
  SELECT jsonb_build_object(
    'template_id', pt.id,
    'template_name', pt.name,
    'flow_type', p_flow_type,
    'customer_data', v_customer_data,
    'estimates', COALESCE(v_estimate_data, '[]'::jsonb),
    'slides', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ps.id,
          'title', ps.title,
          'type', ps.slide_type,
          'content', ps.content,
          'action_button', CASE 
            WHEN ps.action_button_enabled THEN jsonb_build_object(
              'enabled', true,
              'label', ps.action_button_label,
              'type', ps.action_button_type,
              'config', ps.action_button_config
            )
            ELSE jsonb_build_object('enabled', false)
          END
        ) ORDER BY ps.slide_order
      )
      FROM presentation_slides ps
      WHERE ps.template_id = pt.id
        AND ps.template_id = p_template_id
        AND (
          (p_flow_type = 'retail' AND ps.show_for_retail = true)
          OR (p_flow_type = 'insurance' AND ps.show_for_insurance = true)
        )
        AND (
          ps.requires_estimates = false
          OR (ps.requires_estimates = true AND p_estimate_ids IS NOT NULL)
        )
    )
  ) INTO v_deck
  FROM presentation_templates pt
  WHERE pt.id = p_template_id;

  RETURN v_deck;
END;
$$;

-- =============================================
-- SEED DATA - Basic Retail Template
-- =============================================

-- Note: This will be inserted after companies exist
-- For now, just the structure is ready
