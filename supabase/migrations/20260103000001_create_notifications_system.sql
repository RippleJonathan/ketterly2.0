-- Create notifications system
-- =====================================================

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'company',      -- Company-wide announcements
  'location',     -- Location-specific updates
  'user',         -- User-specific notifications
  'system'        -- System maintenance notifications
);

-- Notification priority
CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high'
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'user',
  priority notification_priority NOT NULL DEFAULT 'medium',

  -- Targeting (optional - for location-specific notifications)
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- User notification reads (tracks which users have read which notifications)
CREATE TABLE public.user_notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, notification_id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_location_id ON notifications(location_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_user_notification_reads_user_id ON user_notification_reads(user_id);
CREATE INDEX idx_user_notification_reads_notification_id ON user_notification_reads(notification_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can only see notifications from their company
CREATE POLICY "Users can view notifications from their company"
  ON notifications
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Location-specific notifications: users can only see notifications for locations they have access to
CREATE POLICY "Users can view location notifications they have access to"
  ON notifications
  FOR SELECT
  USING (
    type != 'location' OR
    location_id IS NULL OR
    location_id IN (
      SELECT location_id
      FROM location_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins and office users can create notifications
CREATE POLICY "Admins and office users can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'office')
    )
  );

-- Only the creator can update their notifications
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (created_by = auth.uid());

-- Only the creator can delete their notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for user_notification_reads
-- Users can only manage their own read status
CREATE POLICY "Users can manage their own notification reads"
  ON user_notification_reads
  FOR ALL
  USING (user_id = auth.uid());

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_notification_reads (user_id, notification_id)
  VALUES (auth.uid(), p_notification_id)
  ON CONFLICT (user_id, notification_id) DO NOTHING;
END;
$$;

-- Function to mark notification as unread
CREATE OR REPLACE FUNCTION mark_notification_unread(p_notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_notification_reads
  WHERE user_id = auth.uid() AND notification_id = p_notification_id;
END;
$$;

-- Function to create company-wide notification
CREATE OR REPLACE FUNCTION create_company_notification(
  p_title TEXT,
  p_message TEXT,
  p_priority notification_priority DEFAULT 'medium'
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
  INSERT INTO notifications (company_id, title, message, type, priority, created_by)
  VALUES (v_company_id, p_title, p_message, 'company', p_priority, auth.uid())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Function to create location-specific notification
CREATE OR REPLACE FUNCTION create_location_notification(
  p_location_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_priority notification_priority DEFAULT 'medium'
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
  INSERT INTO notifications (company_id, title, message, type, priority, location_id, created_by)
  VALUES (v_company_id, p_title, p_message, 'location', p_priority, p_location_id, auth.uid())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;