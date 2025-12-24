-- Add company_signed_by_name column for company signature
ALTER TABLE public.generated_documents
ADD COLUMN IF NOT EXISTS company_signed_by_name TEXT;

COMMENT ON COLUMN public.generated_documents.company_signed_by_name IS 'Name of company representative who signed';
