-- Add last_emailed_at and requires_signature columns to generated_documents table
ALTER TABLE public.generated_documents
ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.generated_documents.last_emailed_at IS 'Timestamp of when the document was last emailed to customer';
COMMENT ON COLUMN public.generated_documents.requires_signature IS 'Whether this document requires customer signature';
