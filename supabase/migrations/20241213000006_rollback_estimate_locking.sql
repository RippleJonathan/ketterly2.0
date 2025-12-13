-- =====================================================================
-- ROLLBACK: Remove Estimate Locking Mechanism
-- Estimates should remain editable after signing
-- =====================================================================

-- Drop trigger first, then function (order matters to avoid dependency errors)
DROP TRIGGER IF EXISTS auto_lock_signed_estimate ON public.quotes;
DROP TRIGGER IF EXISTS trigger_auto_lock_estimate ON public.quotes;
DROP FUNCTION IF EXISTS auto_lock_signed_estimate() CASCADE;

-- Remove locking-related columns from quotes
ALTER TABLE public.quotes 
DROP COLUMN IF EXISTS is_locked,
DROP COLUMN IF EXISTS needs_new_signature,
DROP COLUMN IF EXISTS invoice_generated_at,
DROP COLUMN IF EXISTS invoice_pdf_url;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Estimate locking mechanism removed. Estimates remain editable after signing.';
END $$;
