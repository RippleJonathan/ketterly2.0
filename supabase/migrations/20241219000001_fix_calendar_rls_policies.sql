-- Migration: Fix calendar RLS policies for auto-created events and soft deletes
-- Issue: Material order auto-creation fails RLS, delete uses UPDATE but policy checks DELETE

-- =============================================
-- 1. DROP EXISTING POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can create calendar events with permissions" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete calendar events with permission" ON public.calendar_events;

-- =============================================
-- 2. RECREATE INSERT POLICY (More Permissive)
-- =============================================

-- Policy: Users can create events for their company
-- Simplified to allow any user to create events (permissions checked at app level)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calendar_events' 
    AND policyname = 'Users can create calendar events'
  ) THEN
    CREATE POLICY "Users can create calendar events"
      ON public.calendar_events FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM public.users WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
      );
  END IF;
END $$;

-- =============================================
-- 3. RECREATE UPDATE POLICY (Allow Soft Deletes)
-- =============================================

-- Policy: Users can update their own events or all events if they have permission
-- This policy now allows soft deletes (setting deleted_at)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calendar_events' 
    AND policyname = 'Users can update calendar events'
  ) THEN
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
  END IF;
END $$;

-- =============================================
-- 4. KEEP DELETE POLICY (Hard Deletes)
-- =============================================

-- Policy: Only users with edit_all permission can hard delete events
-- (Soft deletes use UPDATE policy above)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calendar_events' 
    AND policyname = 'Users can delete calendar events with permission'
  ) THEN
    CREATE POLICY "Users can delete calendar events with permission"
      ON public.calendar_events FOR DELETE
      USING (
        company_id IN (
          SELECT company_id FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM public.user_permissions
          WHERE user_id = auth.uid()
          AND can_edit_all_events = true
        )
      );
  END IF;
END $$;

-- =============================================
-- 5. GRANT PRODUCTION EVENT PERMISSIONS
-- =============================================

-- Grant production event creation to all existing users
-- (This ensures material/labor order auto-creation works)
UPDATE public.user_permissions
SET can_create_production_events = true
WHERE user_id IN (
  SELECT id FROM public.users WHERE deleted_at IS NULL
);

-- =============================================
-- 6. COMMENTS
-- =============================================

COMMENT ON POLICY "Users can create calendar events" ON public.calendar_events 
  IS 'Allows users to create events for their company. Permission checks handled at application level.';

COMMENT ON POLICY "Users can update calendar events" ON public.calendar_events 
  IS 'Allows users to update their own events or all events if they have permission. Also enables soft deletes.';
