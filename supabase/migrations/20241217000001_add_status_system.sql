-- Migration: Add Status System with Sub-statuses
-- Created: 2024-12-17
-- Description: Adds sub_status column and lead_status_history table for automated status tracking

-- =====================================================
-- 1. ADD SUB_STATUS COLUMN TO LEADS
-- =====================================================

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS sub_status TEXT;

-- =====================================================
-- 2. DROP OLD CONSTRAINT FIRST (before migration!)
-- =====================================================

ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

-- =====================================================
-- 3. MIGRATE EXISTING DATA
-- =====================================================

-- Update existing leads to new status values
UPDATE public.leads
SET status = CASE 
  WHEN status = 'new' THEN 'new_lead'
  WHEN status = 'contacted' THEN 'new_lead'
  WHEN status = 'qualified' THEN 'new_lead'
  WHEN status = 'quote_sent' THEN 'quote'
  WHEN status = 'follow_up' THEN 'quote'
  WHEN status = 'won' THEN 'closed'
  WHEN status = 'lost' THEN 'closed'
  WHEN status = 'archived' THEN 'closed'
  ELSE 'new_lead' -- fallback for any unexpected values
END,
sub_status = CASE 
  WHEN status = 'new' THEN 'uncontacted'
  WHEN status = 'contacted' THEN 'contacted'
  WHEN status = 'qualified' THEN 'qualified'
  WHEN status = 'quote_sent' THEN 'quote_sent'
  WHEN status = 'follow_up' THEN 'estimating'
  WHEN status = 'won' THEN 'completed'
  WHEN status = 'lost' THEN 'lost'
  WHEN status = 'archived' THEN 'archived'
  ELSE 'uncontacted'
END
WHERE status IN ('new', 'contacted', 'qualified', 'quote_sent', 'follow_up', 'won', 'lost', 'archived');

-- =====================================================
-- 4. ADD NEW CONSTRAINT (AFTER migration!)
-- =====================================================

-- Add new constraint with updated status values
ALTER TABLE public.leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new_lead', 'quote', 'production', 'invoiced', 'closed'));

-- Add sub_status constraint (optional - allows flexibility)
ALTER TABLE public.leads 
ADD CONSTRAINT leads_sub_status_check 
CHECK (
  sub_status IS NULL OR
  sub_status IN (
    -- NEW LEAD sub-statuses
    'uncontacted', 'contacted', 'qualified', 'not_qualified',
    -- QUOTE sub-statuses
    'estimating', 'quote_sent', 'quote_viewed', 'negotiating', 'approved', 'declined', 'expired',
    -- PRODUCTION sub-statuses
    'contract_signed', 'scheduled', 'materials_ordered', 'in_progress', 'completed', 
    'inspection_needed', 'inspection_passed', 'on_hold', 'cancelled',
    -- INVOICED sub-statuses
    'draft', 'sent', 'viewed', 'partial_payment', 'paid', 'overdue', 'collections', 'written_off',
    -- CLOSED sub-statuses
    'completed', 'lost', 'cancelled', 'archived'
  )
);

-- =====================================================
-- 5. CREATE STATUS HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  from_sub_status TEXT,
  to_status TEXT NOT NULL,
  to_sub_status TEXT,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  automated BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_company_id ON lead_status_history(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_created_at ON lead_status_history(created_at);

-- =====================================================
-- 6. ENABLE RLS ON STATUS HISTORY
-- =====================================================

ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see status history for their company's leads
CREATE POLICY "Users can view their company's lead status history"
  ON lead_status_history
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can create status history for their company's leads
CREATE POLICY "Users can create status history for their company"
  ON lead_status_history
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 7. CREATE FUNCTION TO LOG STATUS CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status or sub_status actually changed
  IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.sub_status IS DISTINCT FROM NEW.sub_status) THEN
    INSERT INTO public.lead_status_history (
      company_id,
      lead_id,
      from_status,
      from_sub_status,
      to_status,
      to_sub_status,
      changed_by,
      automated
    ) VALUES (
      NEW.company_id,
      NEW.id,
      OLD.status,
      OLD.sub_status,
      NEW.status,
      NEW.sub_status,
      auth.uid(),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CREATE TRIGGER FOR AUTO-LOGGING
-- =====================================================

DROP TRIGGER IF EXISTS lead_status_change_trigger ON public.leads;

CREATE TRIGGER lead_status_change_trigger
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.sub_status IS DISTINCT FROM NEW.sub_status)
  EXECUTE FUNCTION public.log_lead_status_change();

-- =====================================================
-- 9. ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON COLUMN leads.status IS 'Main status: new_lead, quote, production, invoiced, closed';
COMMENT ON COLUMN leads.sub_status IS 'Detailed sub-status within main status for granular tracking';
COMMENT ON TABLE lead_status_history IS 'Audit trail of all lead status changes';
COMMENT ON COLUMN lead_status_history.automated IS 'True if status change was automated, false if manual';
COMMENT ON COLUMN lead_status_history.metadata IS 'Additional context about the status change (e.g., quote_id, payment_id)';
