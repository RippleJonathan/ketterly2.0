-- Migration: Debug and completely rebuild all calendar_events policies
-- Problem: RLS policies still blocking deletes even after previous migrations
-- Solution: Drop ALL policies and rebuild from scratch with minimal restrictions

-- =============================================
-- 1. DROP ALL EXISTING POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete calendar events" ON public.calendar_events;

-- =============================================
-- 2. CREATE SIMPLE, PERMISSIVE POLICIES
-- =============================================

-- SELECT policy: View events in your company
CREATE POLICY "Users can view calendar events"
  ON public.calendar_events FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- INSERT policy: Create events in your company
CREATE POLICY "Users can insert calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- UPDATE policy: Update events in your company (NO WITH CHECK!)
CREATE POLICY "Users can update calendar events"
  ON public.calendar_events FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );
  -- CRITICAL: No WITH CHECK clause allows partial updates like soft deletes

-- DELETE policy: Hard delete events (though we use soft deletes via UPDATE)
CREATE POLICY "Users can delete calendar events"
  ON public.calendar_events FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- =============================================
-- 3. VERIFY ALL POLICIES
-- =============================================

DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE '=== CALENDAR_EVENTS POLICIES ===';
  
  FOR policy_rec IN 
    SELECT 
      policyname,
      cmd,
      qual IS NOT NULL as has_using,
      with_check IS NOT NULL as has_with_check,
      qual as using_clause,
      with_check as with_check_clause
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_events'
    ORDER BY cmd, policyname
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Policy: % (Command: %)', policy_rec.policyname, policy_rec.cmd;
    RAISE NOTICE '  Has USING: %', policy_rec.has_using;
    RAISE NOTICE '  Has WITH CHECK: %', policy_rec.has_with_check;
    
    IF policy_rec.cmd = 'UPDATE' AND policy_rec.has_with_check THEN
      RAISE WARNING '⚠️  UPDATE policy has WITH CHECK - this will break soft deletes!';
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== END POLICIES ===';
END $$;
