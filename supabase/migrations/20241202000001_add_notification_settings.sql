-- Migration: Add notification settings table
-- Created: 2024-12-02
-- Description: Manage company email notification preferences

-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Quote notifications
  quote_sent_to_customer BOOLEAN DEFAULT true,
  quote_accepted_notify_team BOOLEAN DEFAULT true,
  quote_declined_notify_team BOOLEAN DEFAULT false,
  
  -- Invoice notifications
  invoice_sent_to_customer BOOLEAN DEFAULT true,
  invoice_overdue_reminder BOOLEAN DEFAULT true,
  invoice_reminder_days INTEGER DEFAULT 7, -- Days before due date to send reminder
  payment_received_confirmation BOOLEAN DEFAULT true,
  
  -- Project notifications (for future use)
  project_scheduled_crew BOOLEAN DEFAULT true,
  project_started_notify_customer BOOLEAN DEFAULT false,
  project_completed_review_request BOOLEAN DEFAULT true,
  
  -- Lead notifications
  new_lead_notify_team BOOLEAN DEFAULT true,
  lead_followup_reminder BOOLEAN DEFAULT true,
  
  -- Email settings
  notification_email TEXT, -- Optional: send all notifications to this email instead of individual users
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One settings record per company
  UNIQUE(company_id)
);

-- RLS Policies
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their company's notification settings
CREATE POLICY "Users can view their company's notification settings"
  ON public.notification_settings
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Admins can update their company's notification settings
CREATE POLICY "Admins can update their company's notification settings"
  ON public.notification_settings
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.users 
      WHERE id = auth.uid() 
        AND role IN ('super_admin', 'admin')
    )
  );

-- Create default notification settings for new companies
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_settings (company_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create notification settings when company is created
CREATE TRIGGER on_company_created_create_notification_settings
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_settings();

-- Update updated_at timestamp
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_notification_settings_company_id ON public.notification_settings(company_id);

-- Grant permissions
GRANT SELECT, UPDATE ON public.notification_settings TO authenticated;
GRANT SELECT ON public.notification_settings TO anon;
