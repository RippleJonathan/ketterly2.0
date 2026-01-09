-- Add deleted_at column to quote_signatures table
-- This column is expected by the database but was missing

ALTER TABLE public.quote_signatures
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.quote_signatures.deleted_at IS 'Soft delete timestamp for quote signatures';
