-- Add user_id to notifications for per-user targeting
-- =====================================================

-- Add user_id column to specify the recipient of this notification
ALTER TABLE public.notifications
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add index for faster user-specific queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Add comment
COMMENT ON COLUMN notifications.user_id IS 'The specific user this notification is for. If null, notification is for all users in the company/location.';

-- Update RLS policy to filter by user_id when present
DROP POLICY IF EXISTS "Users can only access their company's notifications" ON notifications;

CREATE POLICY "Users can access their notifications"
  ON notifications
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL  -- Company-wide/location-wide notifications
      OR user_id = auth.uid()  -- User-specific notifications
    )
  );
