-- Lead Commissions System Migration
-- Allows tracking multiple commissions per lead with different payment triggers

-- Create lead_commissions table
CREATE TABLE IF NOT EXISTS public.lead_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  commission_plan_id UUID REFERENCES public.commission_plans(id) ON DELETE SET NULL,
  
  -- Commission structure
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'flat_amount', 'custom')),
  commission_rate NUMERIC(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100), -- % if type is percentage
  flat_amount NUMERIC(10,2) CHECK (flat_amount >= 0), -- $ if type is flat
  calculated_amount NUMERIC(10,2) NOT NULL DEFAULT 0, -- Final commission owed
  base_amount NUMERIC(10,2) NOT NULL DEFAULT 0, -- What commission is calculated on
  
  -- Payment trigger
  paid_when TEXT NOT NULL DEFAULT 'when_final_payment' 
    CHECK (paid_when IN ('when_deposit_paid', 'when_job_completed', 'when_final_payment', 'custom')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES public.users(id),
  payment_notes TEXT,
  notes TEXT,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_lead_commissions_company_id ON public.lead_commissions(company_id);
CREATE INDEX idx_lead_commissions_lead_id ON public.lead_commissions(lead_id);
CREATE INDEX idx_lead_commissions_user_id ON public.lead_commissions(user_id);
CREATE INDEX idx_lead_commissions_status ON public.lead_commissions(status);
CREATE INDEX idx_lead_commissions_deleted_at ON public.lead_commissions(deleted_at);

-- Enable Row Level Security
ALTER TABLE public.lead_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their company's commissions
CREATE POLICY "Users can access their company's lead commissions"
  ON public.lead_commissions
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_lead_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_commissions_updated_at
  BEFORE UPDATE ON public.lead_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_commissions_updated_at();

-- Add commission permissions to user_permissions table
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS can_view_commissions BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_commissions BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_mark_commissions_paid BOOLEAN NOT NULL DEFAULT false;

-- Update existing permission records to have these new columns (all false by default)
-- They're already added with DEFAULT false, so no update needed

-- Set default permissions for admin role users
UPDATE public.user_permissions
SET 
  can_view_commissions = true,
  can_manage_commissions = true,
  can_mark_commissions_paid = true
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'admin'
);

-- Set default permissions for office role users
UPDATE public.user_permissions
SET 
  can_view_commissions = true,
  can_manage_commissions = true,
  can_mark_commissions_paid = true
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'office'
);

-- Set default permissions for sales_manager role users
UPDATE public.user_permissions
SET 
  can_view_commissions = true,
  can_manage_commissions = true,
  can_mark_commissions_paid = false
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'sales_manager'
);

-- Set default permissions for sales role users
UPDATE public.user_permissions
SET 
  can_view_commissions = true,
  can_manage_commissions = false,
  can_mark_commissions_paid = false
WHERE user_id IN (
  SELECT id FROM public.users WHERE role = 'sales'
);

-- Comment on table
COMMENT ON TABLE public.lead_commissions IS 'Tracks commission payments for leads with multiple commission structures and payment triggers';

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_commissions TO authenticated;
