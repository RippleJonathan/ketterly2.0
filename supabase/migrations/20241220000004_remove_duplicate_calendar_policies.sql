-- Migration: Remove duplicate/old calendar_events policies
-- Problem: Multiple policies exist from different migrations
-- Solution: Drop old policies, keep only the clean ones

-- =============================================
-- 1. DROP OLD/DUPLICATE POLICIES
-- =============================================

-- Drop the old SELECT policy (has deleted_at check)
DROP POLICY IF EXISTS "Users can view their company's calendar events" ON public.calendar_events;

-- Drop the old INSERT policy (has created_by requirement)
DROP POLICY IF EXISTS "Users can create calendar events" ON public.calendar_events;

-- Drop the old DELETE policy (has permission check)
DROP POLICY IF EXISTS "Users can delete calendar events with permission" ON public.calendar_events;

-- =============================================
-- 2. VERIFY ONLY 4 POLICIES REMAIN
-- =============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'calendar_events';
  
  RAISE NOTICE 'Total policies after cleanup: %', policy_count;
  
  IF policy_count != 4 THEN
    RAISE WARNING 'Expected 4 policies, found %!', policy_count;
  ELSE
    RAISE NOTICE '✓ Correct number of policies (4)';
  END IF;
END $$;

-- Show remaining policies
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'calendar_events'
ORDER BY cmd, policyname;
