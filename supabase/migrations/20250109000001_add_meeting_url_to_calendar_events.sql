-- Add meeting_url and send_email_to_customer columns to calendar_events table
-- meeting_url: stores video meeting links (Zoom, Google Meet, etc.) for virtual appointments
-- send_email_to_customer: flag to trigger email notification to customer about appointment

ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS meeting_url TEXT,
ADD COLUMN IF NOT EXISTS send_email_to_customer BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.calendar_events.meeting_url IS 'URL for virtual meeting (Zoom, Google Meet, etc.)';
COMMENT ON COLUMN public.calendar_events.send_email_to_customer IS 'Whether to send email notification to customer about this appointment';
