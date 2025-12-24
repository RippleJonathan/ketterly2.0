-- =====================================================================
-- Document Builder System
-- Created: 2024-12-23
-- Tables: document_templates, generated_documents
-- =====================================================================

-- =====================================================
-- DOCUMENT TEMPLATES TABLE
-- Store reusable document templates (contracts, work orders, proposals)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'contract', 'work_order', 'proposal', 'invoice', 'custom'
  
  -- Document structure (array of sections)
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_global BOOLEAN DEFAULT false NOT NULL, -- Platform-wide templates
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Page settings
  page_size TEXT DEFAULT 'letter', -- 'letter', 'a4'
  margins JSONB DEFAULT '{"top": 0.75, "right": 0.75, "bottom": 0.75, "left": 0.75}'::jsonb,
  
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_category CHECK (category IN ('contract', 'work_order', 'proposal', 'invoice', 'custom'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_company_id ON public.document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON public.document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_global ON public.document_templates(is_global, is_active);

-- RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their company's templates + global templates
CREATE POLICY "users_view_document_templates"
  ON public.document_templates
  FOR SELECT
  USING (
    (is_global = true AND is_active = true AND deleted_at IS NULL)
    OR (company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    ) AND deleted_at IS NULL)
  );

-- Users can create templates for their company
CREATE POLICY "users_create_document_templates"
  ON public.document_templates
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Users can update their company's templates
CREATE POLICY "users_update_document_templates"
  ON public.document_templates
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Users can delete their company's templates
CREATE POLICY "users_delete_document_templates"
  ON public.document_templates
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Trigger: Update updated_at timestamp
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GENERATED DOCUMENTS TABLE
-- Store documents created from templates with filled-in data
-- =====================================================

CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  
  -- Linked entities
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Document details
  title TEXT NOT NULL,
  document_number TEXT, -- e.g., 'CONTRACT-2024-001'
  
  -- Content (final rendered sections with data filled in)
  sections JSONB NOT NULL,
  
  -- Generated files
  pdf_url TEXT, -- Supabase Storage URL
  pdf_generated_at TIMESTAMPTZ,
  
  -- eSignature tracking
  status TEXT DEFAULT 'draft' NOT NULL, -- 'draft', 'sent', 'pending_signatures', 'signed', 'declined', 'voided'
  
  -- Customer signature
  customer_signature_data TEXT,
  customer_signature_ip TEXT,
  customer_signed_at TIMESTAMPTZ,
  customer_signed_by_name TEXT,
  customer_signed_by_email TEXT,
  
  -- Company signature
  company_signature_data TEXT,
  company_signature_ip TEXT,
  company_signed_at TIMESTAMPTZ,
  company_signed_by UUID REFERENCES public.users(id),
  
  -- Sharing
  share_token TEXT UNIQUE,
  share_link_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'pending_signatures', 'signed', 'declined', 'voided'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_documents_company_id ON public.generated_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_template_id ON public.generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_lead_id ON public.generated_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_quote_id ON public.generated_documents(quote_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_project_id ON public.generated_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_status ON public.generated_documents(status);
CREATE INDEX IF NOT EXISTS idx_generated_documents_share_token ON public.generated_documents(share_token) WHERE share_token IS NOT NULL;

-- RLS
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their company's documents + public shared docs
CREATE POLICY "users_view_generated_documents"
  ON public.generated_documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    OR (share_token IS NOT NULL AND deleted_at IS NULL)
  );

-- Users can create documents for their company
CREATE POLICY "users_create_generated_documents"
  ON public.generated_documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Users can update their company's documents
CREATE POLICY "users_update_generated_documents"
  ON public.generated_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Users can delete their company's documents
CREATE POLICY "users_delete_generated_documents"
  ON public.generated_documents
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Trigger: Update updated_at timestamp
CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.document_templates IS 'Reusable document templates with customizable sections';
COMMENT ON TABLE public.generated_documents IS 'Generated documents from templates with eSignature tracking';

COMMENT ON COLUMN public.document_templates.sections IS 'JSONB array of document sections with content and settings';
COMMENT ON COLUMN public.document_templates.is_global IS 'If true, visible to all companies (platform templates)';
COMMENT ON COLUMN public.generated_documents.sections IS 'Final sections with variables replaced by actual data';
COMMENT ON COLUMN public.generated_documents.share_token IS 'Unique token for public signature link';
