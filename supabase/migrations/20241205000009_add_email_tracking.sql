-- Migration: Add email tracking for material orders
-- Created: 2024-12-05
-- Description: Track emails sent for purchase orders to suppliers

-- Create material_order_emails table
CREATE TABLE IF NOT EXISTS public.material_order_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  order_id UUID REFERENCES public.material_orders(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  
  -- Email details
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN (
    'sending',    -- Being sent
    'sent',       -- Successfully sent
    'failed',     -- Failed to send
    'bounced'     -- Email bounced
  )) DEFAULT 'sending',
  
  -- Error tracking
  error_message TEXT,
  
  -- Metadata
  sent_by UUID REFERENCES public.users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_material_order_emails_company_id ON public.material_order_emails(company_id);
CREATE INDEX IF NOT EXISTS idx_material_order_emails_order_id ON public.material_order_emails(order_id);
CREATE INDEX IF NOT EXISTS idx_material_order_emails_supplier_id ON public.material_order_emails(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_order_emails_status ON public.material_order_emails(status);
CREATE INDEX IF NOT EXISTS idx_material_order_emails_sent_at ON public.material_order_emails(sent_at DESC);

-- RLS Policies
ALTER TABLE public.material_order_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their company's order emails"
  ON public.material_order_emails
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_material_order_emails_updated_at
  BEFORE UPDATE ON public.material_order_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add email tracking to material_orders table
ALTER TABLE public.material_orders 
ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_count INTEGER DEFAULT 0;

-- Comment
COMMENT ON TABLE public.material_order_emails IS 'Tracks emails sent for purchase orders to suppliers';
