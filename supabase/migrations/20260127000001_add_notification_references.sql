-- Add reference tracking to notifications for navigation
-- =====================================================

-- Create enum for notification reference types
CREATE TYPE notification_reference_type AS ENUM (
  'lead',
  'quote',
  'invoice',
  'calendar_event',
  'project',
  'customer',
  'user',
  'location',
  'commission',
  'material_order',
  'work_order',
  'door_knock_pin'
);

-- Add reference columns to notifications table
ALTER TABLE public.notifications
ADD COLUMN reference_type notification_reference_type,
ADD COLUMN reference_id UUID;

-- Add index for faster lookups
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);

-- Add comment
COMMENT ON COLUMN notifications.reference_type IS 'Type of entity this notification references (for navigation)';
COMMENT ON COLUMN notifications.reference_id IS 'ID of the entity this notification references (for navigation)';

-- Update the create_company_notification function to support references
CREATE OR REPLACE FUNCTION create_company_notification(
  p_title TEXT,
  p_message TEXT,
  p_priority notification_priority DEFAULT 'medium',
  p_reference_type notification_reference_type DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_notification_id UUID;
BEGIN
  -- Get user's company
  SELECT company_id INTO v_company_id
  FROM users
  WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a company';
  END IF;

  -- Check if user has permission (admin or office)
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'office')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create company notifications';
  END IF;

  -- Create notification
  INSERT INTO notifications (company_id, title, message, type, priority, created_by, reference_type, reference_id)
  VALUES (v_company_id, p_title, p_message, 'company', p_priority, auth.uid(), p_reference_type, p_reference_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Update the create_location_notification function to support references
CREATE OR REPLACE FUNCTION create_location_notification(
  p_location_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_priority notification_priority DEFAULT 'medium',
  p_reference_type notification_reference_type DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_notification_id UUID;
BEGIN
  -- Get user's company
  SELECT company_id INTO v_company_id
  FROM users
  WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a company';
  END IF;

  -- Check if user has permission (admin or office)
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'office')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create location notifications';
  END IF;

  -- Check if user has access to the location
  IF NOT EXISTS (
    SELECT 1 FROM location_users
    WHERE user_id = auth.uid() AND location_id = p_location_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to this location';
  END IF;

  -- Create notification
  INSERT INTO notifications (company_id, title, message, type, priority, location_id, created_by, reference_type, reference_id)
  VALUES (v_company_id, p_title, p_message, 'location', p_priority, p_location_id, auth.uid(), p_reference_type, p_reference_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;
