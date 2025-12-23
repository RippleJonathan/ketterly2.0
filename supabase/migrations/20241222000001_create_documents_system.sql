-- =====================================================================
-- Create Documents System (Global + Company Documents)
-- Created: 2024-12-22
-- =====================================================================

-- =====================================================
-- GLOBAL DOCUMENTS TABLE
-- Platform-wide documents visible to all companies
-- =====================================================

CREATE TABLE IF NOT EXISTS public.global_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'contracts', 'compliance', 'training', 'product_catalogs', 'best_practices', 'other'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'xlsx', 'png', 'jpg', etc.
  
  -- Versioning
  version TEXT DEFAULT '1.0',
  supersedes_id UUID REFERENCES public.global_documents(id) ON DELETE SET NULL,
  
  -- Access control
  is_active BOOLEAN DEFAULT true NOT NULL,
  visibility TEXT DEFAULT 'all' NOT NULL, -- 'all', 'premium_only', 'admin_only'
  
  -- Metadata
  uploaded_by TEXT, -- Platform admin identifier (not FK to users)
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for global_documents
CREATE INDEX IF NOT EXISTS idx_global_documents_category ON public.global_documents(category);
CREATE INDEX IF NOT EXISTS idx_global_documents_active ON public.global_documents(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_global_documents_tags ON public.global_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_global_documents_visibility ON public.global_documents(visibility);

-- RLS for global_documents
ALTER TABLE public.global_documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active global documents
CREATE POLICY "authenticated_users_view_active_global_documents"
  ON public.global_documents
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true 
    AND deleted_at IS NULL
    AND (
      visibility = 'all'
      OR (visibility = 'premium_only' AND EXISTS (
        SELECT 1 FROM public.users 
        JOIN public.companies ON users.company_id = companies.id
        WHERE users.id = auth.uid() 
        AND companies.subscription_tier IN ('pro', 'enterprise')
      ))
      OR (visibility = 'admin_only' AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'owner')
      ))
    )
  );

-- Trigger: Update updated_at timestamp
CREATE TRIGGER update_global_documents_updated_at
  BEFORE UPDATE ON public.global_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPANY DOCUMENTS TABLE
-- Per-company document storage
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Document details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'policies', 'insurance', 'licenses', 'contracts', 'branding', 'marketing', 'safety', 'templates', 'other'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  
  -- Metadata
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_archived BOOLEAN DEFAULT false NOT NULL,
  
  -- eSign/template integration (future use)
  is_template BOOLEAN DEFAULT false NOT NULL,
  template_variables JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for company_documents
CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON public.company_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_category ON public.company_documents(category);
CREATE INDEX IF NOT EXISTS idx_company_documents_uploaded_by ON public.company_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_company_documents_tags ON public.company_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_company_documents_archived ON public.company_documents(is_archived) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_company_documents_templates ON public.company_documents(is_template) WHERE is_template = true AND deleted_at IS NULL;

-- RLS for company_documents
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their company's documents
CREATE POLICY "users_view_company_documents"
  ON public.company_documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Users can upload documents to their company
CREATE POLICY "users_upload_company_documents"
  ON public.company_documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Users can update their company's documents
CREATE POLICY "users_update_company_documents"
  ON public.company_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Only admins can soft-delete their company's documents
CREATE POLICY "admins_delete_company_documents"
  ON public.company_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Trigger: Update updated_at timestamp
CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.global_documents IS 'Platform-wide documents (read-only for companies, managed by platform admin)';
COMMENT ON TABLE public.company_documents IS 'Company-specific documents (uploadable by company users)';

COMMENT ON COLUMN public.global_documents.visibility IS 'Controls who can see this document: all, premium_only, admin_only';
COMMENT ON COLUMN public.company_documents.is_template IS 'If true, can be used as eSign template';
COMMENT ON COLUMN public.company_documents.template_variables IS 'JSON object defining placeholder variables for templates';
