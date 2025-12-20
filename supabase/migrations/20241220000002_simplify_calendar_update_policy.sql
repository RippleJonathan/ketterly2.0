-- Migration: Simplify calendar UPDATE policy to fix delete issues
-- Problem: Complex USING clause is too restrictive
-- Solution: Allow users to update events in their company

-- =============================================
-- 1. DROP EXISTING UPDATE POLICY
-- =============================================

DROP POLICY IF EXISTS "Users can update calendar events" ON public.calendar_events;

-- =============================================
-- 2. CREATE SIMPLIFIED UPDATE POLICY
-- =============================================

-- Much simpler: Just check company_id matches
-- This allows soft deletes (setting deleted_at) to work
CREATE POLICY "Users can update calendar events"
  ON public.calendar_events FOR UPDATE
  USING (
    -- User is in the same company as the event
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );
  -- NOTE: No WITH CHECK clause - allows partial updates (soft deletes)
  -- NOTE: No deleted_at check - allows updating deleted events if needed
  -- NOTE: No creator/permission check - trust company isolation

-- =============================================
-- 3. VERIFY POLICY
-- =============================================

COMMENT ON POLICY "Users can update calendar events" ON public.calendar_events 
  IS 'Allows users to update any event in their company. Simplified to support soft deletes.';

-- Show verification
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
  RAISE NOTICE 'Policy definition: %', policy_record.qual;
  RAISE NOTICE 'Has WITH CHECK: %', (policy_record.with_check IS NOT NULL);
END $$;
