-- Migration: Force fix calendar UPDATE policy for soft deletes
-- Issue: Existing policy still has WITH CHECK clause that breaks soft deletes
-- This migration forcefully replaces the policy

-- =============================================
-- 1. DROP AND RECREATE UPDATE POLICY
-- =============================================

-- Drop the existing UPDATE policy (it has the bad WITH CHECK clause)
DROP POLICY IF EXISTS "Users can update calendar events" ON public.calendar_events;

-- Recreate UPDATE policy WITHOUT the problematic WITH CHECK clause
CREATE POLICY "Users can update calendar events"
  ON public.calendar_events FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL -- Can only update non-deleted events
    AND (
      -- Can update own events
      created_by = auth.uid()
      OR
      -- Can update all events if has permission
      EXISTS (
        SELECT 1 FROM public.user_permissions
        WHERE user_id = auth.uid()
        AND can_edit_all_events = true
      )
    )
  );
  -- NOTE: No WITH CHECK clause - this is intentional!
  -- WITH CHECK validates the NEW row state after UPDATE
  -- For soft deletes, we only set deleted_at, so WITH CHECK would fail

-- =============================================
-- 2. VERIFY POLICY
-- =============================================

-- Comment to document the fix
COMMENT ON POLICY "Users can update calendar events" ON public.calendar_events 
  IS 'Allows users to update their own events or all events if they have permission. Supports soft deletes by NOT using WITH CHECK clause.';

-- Show the policy for verification
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  SELECT * INTO policy_record
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'calendar_events'
    AND policyname = 'Users can update calendar events';
  
  RAISE NOTICE 'Policy recreated: %', policy_record.policyname;
  RAISE NOTICE 'Policy command: %', policy_record.cmd;
  RAISE NOTICE 'Has WITH CHECK: %', (policy_record.with_check IS NOT NULL);
END $$;
