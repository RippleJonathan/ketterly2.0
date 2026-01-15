-- Add OneSignal player_id column to users table for push notifications
-- This allows us to target users by their OneSignal player ID instead of external_id

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_onesignal_player_id 
ON users(onesignal_player_id) 
WHERE onesignal_player_id IS NOT NULL;

COMMENT ON COLUMN users.onesignal_player_id IS 
  'OneSignal player/subscription ID for push notifications';
