-- Rename deposited fields to cleared (more accurate terminology)
-- "Cleared" means the bank has approved the payment (won't bounce)

ALTER TABLE public.payments 
  RENAME COLUMN deposited TO cleared;

ALTER TABLE public.payments 
  RENAME COLUMN deposit_date TO cleared_date;

ALTER TABLE public.payments 
  RENAME COLUMN deposit_reference TO clearing_reference;

-- Update comments
COMMENT ON COLUMN public.payments.cleared IS 'Whether payment has cleared the bank (approved, won''t bounce)';
COMMENT ON COLUMN public.payments.cleared_date IS 'Date payment cleared the bank';
COMMENT ON COLUMN public.payments.clearing_reference IS 'Bank clearing reference or confirmation number';
