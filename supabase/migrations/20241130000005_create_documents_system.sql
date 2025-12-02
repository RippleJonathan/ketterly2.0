-- =============================================
-- E-Signature & Document Management System
-- Migration: Create documents, signatures, and share links tables
-- Date: November 30, 2024
-- =============================================

-- =============================================
-- DOCUMENTS TABLE
-- Stores all files associated with leads (quotes, contracts, photos, etc.)
-- =============================================

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  
  -- Document info
  document_type TEXT NOT NULL CHECK (document_type IN (
    'quote',           -- Generated quote PDF
    'contract',        -- Contract requiring signature
    'invoice',         -- Invoice PDF
    'photo',           -- Job site photo
    'receipt',         -- Payment receipt
    'permit',          -- Building permit
    'insurance',       -- Insurance certificate
    'warranty',        -- Warranty document
    'change_order',    -- Change order form
    'completion',      -- Certificate of completion
    'other'            -- Misc uploads
  )),
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- File storage (Supabase Storage)
  file_url TEXT NOT NULL,        -- Storage path
  file_name TEXT NOT NULL,       -- Original filename
  file_size INTEGER,             -- Bytes
  mime_type TEXT,                -- application/pdf, image/jpeg, etc.
  
  -- Version control
  version INTEGER DEFAULT 1,
  supersedes_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  
  -- Signature tracking
  requires_signature BOOLEAN DEFAULT false,
  signature_status TEXT CHECK (signature_status IN ('pending', 'signed', 'declined', 'expired')),
  
  -- Related records
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  invoice_id UUID,  -- Will reference invoices table when created
  
  -- Metadata
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Visibility
  visible_to_customer BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_documents_company_id ON public.documents(company_id);
CREATE INDEX idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX idx_documents_quote_id ON public.documents(quote_id);
CREATE INDEX idx_documents_document_type ON public.documents(document_type);
CREATE INDEX idx_documents_signature_status ON public.documents(signature_status);
CREATE INDEX idx_documents_deleted_at ON public.documents(deleted_at);

-- Updated_at trigger
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DOCUMENT SIGNATURE FIELDS TABLE
-- Defines where signatures/initials are required on a document
-- =============================================

CREATE TABLE public.document_signature_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  
  -- Field info
  field_type TEXT NOT NULL CHECK (field_type IN ('signature', 'initial', 'date', 'text')),
  field_label TEXT NOT NULL,           -- "Customer Signature", "Initial here"
  
  -- Position on document (for PDF overlay - future enhancement)
  page_number INTEGER,
  x_position INTEGER,                  -- Pixels from left
  y_position INTEGER,                  -- Pixels from top
  width INTEGER,
  height INTEGER,
  
  -- Who needs to sign
  signer_role TEXT NOT NULL CHECK (signer_role IN ('customer', 'company', 'crew_lead')),
  
  -- Is this field required?
  required BOOLEAN DEFAULT true,
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signature_fields_document_id ON public.document_signature_fields(document_id);
CREATE INDEX idx_signature_fields_signer_role ON public.document_signature_fields(signer_role);

-- =============================================
-- DOCUMENT SIGNATURES TABLE
-- Stores actual signatures when someone signs
-- =============================================

CREATE TABLE public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  signature_field_id UUID REFERENCES public.document_signature_fields(id) ON DELETE SET NULL,
  
  -- Signer information
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('customer', 'company', 'crew_lead')),
  
  -- Signature data (base64 encoded PNG image or text value)
  signature_type TEXT NOT NULL CHECK (signature_type IN ('signature', 'initial', 'text', 'date')),
  signature_data TEXT NOT NULL,
  
  -- Legal verification (ESIGN Act compliance)
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Consent to electronic signatures
  agreed_to_terms BOOLEAN DEFAULT true,
  consent_text TEXT NOT NULL,          -- Full text they agreed to
  
  -- Authentication (for added security)
  verification_method TEXT CHECK (verification_method IN ('email_link', 'sms_code', 'none')),
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signatures_document_id ON public.document_signatures(document_id);
CREATE INDEX idx_signatures_signature_field_id ON public.document_signatures(signature_field_id);
CREATE INDEX idx_signatures_signer_email ON public.document_signatures(signer_email);
CREATE INDEX idx_signatures_signed_at ON public.document_signatures(signed_at);

-- =============================================
-- DOCUMENT SHARE LINKS TABLE
-- Secure token-based public access to documents
-- =============================================

CREATE TABLE public.document_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  
  -- Secure token (generated with crypto.randomUUID() or similar)
  share_token TEXT UNIQUE NOT NULL,
  
  -- Access control
  expires_at TIMESTAMPTZ,
  max_views INTEGER,                   -- Null = unlimited
  view_count INTEGER DEFAULT 0,
  
  -- Password protection (optional)
  password_hash TEXT,
  
  -- Permissions
  allow_download BOOLEAN DEFAULT true,
  allow_signature BOOLEAN DEFAULT true,
  
  -- Tracking
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,
  
  -- Revocation
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_share_links_document_id ON public.document_share_links(document_id);
CREATE INDEX idx_share_links_share_token ON public.document_share_links(share_token);
CREATE INDEX idx_share_links_expires_at ON public.document_share_links(expires_at);

-- =============================================
-- DOCUMENT VIEWS TABLE
-- Track who viewed documents and when
-- =============================================

CREATE TABLE public.document_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  share_link_id UUID REFERENCES public.document_share_links(id) ON DELETE SET NULL,
  
  -- Viewer info
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_views_document_id ON public.document_views(document_id);
CREATE INDEX idx_document_views_share_link_id ON public.document_views(share_link_id);
CREATE INDEX idx_document_views_viewed_at ON public.document_views(viewed_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Documents: Users can only see their company's documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's documents"
  ON public.documents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to their company's leads"
  ON public.documents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's documents"
  ON public.documents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's documents"
  ON public.documents FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Document Signature Fields: Same as documents
ALTER TABLE public.document_signature_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signature fields for their company's documents"
  ON public.document_signature_fields FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create signature fields for their company's documents"
  ON public.document_signature_fields FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- Document Signatures: Public can create (for customer signing), users can view their company's
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create signatures (for customer signing)"
  ON public.document_signatures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view signatures on their company's documents"
  ON public.document_signatures FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- Document Share Links: Public can view (token-protected), users can manage their company's
ALTER TABLE public.document_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view share links (token-protected in app logic)"
  ON public.document_share_links FOR SELECT
  USING (true);

CREATE POLICY "Users can create share links for their company's documents"
  ON public.document_share_links FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their company's share links"
  ON public.document_share_links FOR UPDATE
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- Document Views: Anyone can create (tracking), users can view their company's
ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create document views"
  ON public.document_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view document views for their company's documents"
  ON public.document_views FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- STORAGE BUCKET SETUP (run in Supabase Dashboard or via API)
-- =============================================

-- Note: This SQL is for reference. Storage buckets are typically created via Dashboard or API.
-- 
-- Bucket name: 'documents'
-- Public: false (use signed URLs)
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, image/jpeg, image/png, image/jpg, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
--
-- RLS Policy for storage:
-- CREATE POLICY "Users can upload to their company folder"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'documents' AND
--     (storage.foldername(name))[1] IN (
--       SELECT company_id::text FROM users WHERE id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "Users can view their company's files"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'documents' AND
--     (storage.foldername(name))[1] IN (
--       SELECT company_id::text FROM users WHERE id = auth.uid()
--     )
--   );
