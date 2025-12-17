-- =============================================
-- Add notification preference columns to users table
-- =============================================

-- General notification toggles
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false NOT NULL;

-- Specific notification preferences (JSON for flexibility)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "new_leads": true,
  "lead_assigned": true,
  "lead_status_change": true,
  "appointments": true,
  "appointment_reminders": true,
  "messages": true,
  "tasks": true,
  "task_due_soon": true,
  "quotes_sent": true,
  "quotes_approved": true,
  "contracts_signed": true,
  "invoices_paid": true,
  "payments_received": true,
  "project_updates": true,
  "production_scheduled": true,
  "daily_summary": false,
  "weekly_report": false
}'::JSONB;

COMMENT ON COLUMN public.users.email_notifications IS 'Master toggle for email notifications';
COMMENT ON COLUMN public.users.push_notifications IS 'Master toggle for push notifications (OneSignal)';
COMMENT ON COLUMN public.users.sms_notifications IS 'Master toggle for SMS notifications (Twilio)';
COMMENT ON COLUMN public.users.notification_preferences IS 'Granular notification preferences for specific events';
