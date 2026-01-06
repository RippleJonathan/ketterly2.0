-- Quick fix: Add missing columns to lead_commissions table
-- This will allow payment recording to work

-- Payment trigger tracking
ALTER TABLE public.lead_commissions
ADD COLUMN IF NOT EXISTS triggered_by_payment_id UUID REFERENCES payments(id);

-- Approval tracking
ALTER TABLE public.lead_commissions
ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Payment tracking
ALTER TABLE public.lead_commissions
ADD COLUMN IF NOT EXISTS paid_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_commissions_triggered_by_payment ON lead_commissions(triggered_by_payment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_approved_by ON lead_commissions(approved_by_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON lead_commissions(status);

-- Add comments
COMMENT ON COLUMN lead_commissions.triggered_by_payment_id IS 'Payment that triggered commission eligibility (based on paid_when setting)';
COMMENT ON COLUMN lead_commissions.approved_by_user_id IS 'User who approved commission for payment';
COMMENT ON COLUMN lead_commissions.approved_at IS 'Timestamp when commission was approved';
COMMENT ON COLUMN lead_commissions.paid_date IS 'Date when commission was actually paid to user';
COMMENT ON COLUMN lead_commissions.payment_reference IS 'Check number, transaction ID, or other payment reference';

-- Verify the columns were added
SELECT
  'triggered_by_payment_id' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_commissions' AND column_name = 'triggered_by_payment_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT
  'approved_by_user_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_commissions' AND column_name = 'approved_by_user_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'approved_at',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_commissions' AND column_name = 'approved_at'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'paid_date',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_commissions' AND column_name = 'paid_date'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT
  'payment_reference',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_commissions' AND column_name = 'payment_reference'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;