-- Add supplier documents table and storage
-- =====================================================

-- Create supplier_documents table
CREATE TABLE public.supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  
  -- Document details
  document_type TEXT NOT NULL CHECK (document_type IN ('w9', 'insurance', 'contract', 'agreement', 'license', 'certification', 'other')),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type TEXT NOT NULL,
  
  -- Metadata
  notes TEXT,
  expiration_date DATE, -- For insurance, licenses, etc.
  uploaded_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX idx_supplier_documents_company_id ON supplier_documents(company_id);
CREATE INDEX idx_supplier_documents_supplier_id ON supplier_documents(supplier_id);
CREATE INDEX idx_supplier_documents_document_type ON supplier_documents(document_type);

-- Enable RLS
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's supplier documents"
  ON supplier_documents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's supplier documents"
  ON supplier_documents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's supplier documents"
  ON supplier_documents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's supplier documents"
  ON supplier_documents FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_supplier_documents_updated_at
  BEFORE UPDATE ON supplier_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE supplier_documents IS 'Stores documents for suppliers (W-9s, insurance, contracts, etc.)';
