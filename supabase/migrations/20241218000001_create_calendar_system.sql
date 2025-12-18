-- Migration: Create calendar_events table and permissions
-- Feature: Calendar System (#11)
-- Description: Multi-view calendar with auto-event creation from orders

-- =============================================
-- 1. CREATE CALENDAR EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('consultation', 'production_materials', 'production_labor', 'adjuster_meeting', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Date/time
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  
  -- Assignment
  assigned_users UUID[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) NOT NULL,
  
  -- Additional details
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
  
  -- Integrations
  material_order_id UUID REFERENCES public.material_orders(id) ON DELETE SET NULL,
  labor_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  
  -- Recurring events
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern JSONB,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- 2. CREATE INDEXES
-- =============================================

CREATE INDEX idx_calendar_events_company_id ON public.calendar_events(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_lead_id ON public.calendar_events(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_event_date ON public.calendar_events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_event_type ON public.calendar_events(event_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_assigned_users ON public.calendar_events USING GIN(assigned_users);
CREATE INDEX idx_calendar_events_status ON public.calendar_events(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_material_order_id ON public.calendar_events(material_order_id) WHERE material_order_id IS NOT NULL;
CREATE INDEX idx_calendar_events_labor_order_id ON public.calendar_events(labor_order_id) WHERE labor_order_id IS NOT NULL;
CREATE INDEX idx_calendar_events_created_by ON public.calendar_events(created_by);

-- Composite index for common queries (events in date range for company)
CREATE INDEX idx_calendar_events_company_date ON public.calendar_events(company_id, event_date) WHERE deleted_at IS NULL;

-- =============================================
-- 3. ADD CALENDAR PERMISSIONS
-- =============================================

-- Add new permission columns to user_permissions table
ALTER TABLE public.user_permissions
ADD COLUMN IF NOT EXISTS can_view_calendar BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS can_create_consultations BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS can_create_production_events BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS can_edit_all_events BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS can_manage_recurring_events BOOLEAN DEFAULT false NOT NULL;

-- =============================================
-- 4. UPDATE EXISTING USER PERMISSIONS
-- =============================================

-- Grant calendar permissions to existing users based on role
UPDATE public.user_permissions up
SET 
  can_view_calendar = true,
  can_create_consultations = true,
  can_create_production_events = CASE 
    WHEN u.role IN ('admin', 'office', 'production_manager') THEN true 
    ELSE false 
  END,
  can_edit_all_events = CASE 
    WHEN u.role IN ('admin', 'office') THEN true 
    ELSE false 
  END,
  can_manage_recurring_events = CASE 
    WHEN u.role IN ('admin', 'office') THEN true 
    ELSE false 
  END
FROM public.users u
WHERE up.user_id = u.id;

-- =============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's events
CREATE POLICY "Users can view their company's calendar events"
  ON public.calendar_events FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Policy: Users can create events with proper permissions
CREATE POLICY "Users can create calendar events with permissions"
  ON public.calendar_events FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
    AND (
      -- Anyone with permission can create consultation, adjuster, other
      (
        event_type IN ('consultation', 'adjuster_meeting', 'other')
        AND EXISTS (
          SELECT 1 FROM public.user_permissions
          WHERE user_id = auth.uid()
          AND can_create_consultations = true
        )
      )
      OR
      -- Only users with production permission can create production events
      (
        event_type IN ('production_materials', 'production_labor')
        AND EXISTS (
          SELECT 1 FROM public.user_permissions
          WHERE user_id = auth.uid()
          AND can_create_production_events = true
        )
      )
    )
  );

-- Policy: Users can update their own events or all events if they have permission
CREATE POLICY "Users can update calendar events"
  ON public.calendar_events FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_permissions
        WHERE user_id = auth.uid()
        AND can_edit_all_events = true
      )
    )
  );

-- Policy: Only users with edit_all permission can delete events
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

-- =============================================
-- 6. TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_events_updated_at();

-- =============================================
-- 7. HELPER FUNCTION: CHECK EVENT CONFLICTS
-- =============================================

-- Function to check if a user has overlapping events
CREATE OR REPLACE FUNCTION public.check_event_conflicts(
  p_user_id UUID,
  p_event_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_count INTEGER,
  conflicting_events JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as conflict_count,
    jsonb_agg(
      jsonb_build_object(
        'id', ce.id,
        'title', ce.title,
        'start_time', ce.start_time,
        'end_time', ce.end_time
      )
    ) as conflicting_events
  FROM public.calendar_events ce
  WHERE ce.deleted_at IS NULL
    AND p_user_id = ANY(ce.assigned_users)
    AND ce.event_date = p_event_date
    AND ce.is_all_day = false
    AND (p_exclude_event_id IS NULL OR ce.id != p_exclude_event_id)
    AND (
      -- Check for time overlap
      (p_start_time, p_end_time) OVERLAPS (ce.start_time, ce.end_time)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. COMMENTS
-- =============================================

COMMENT ON TABLE public.calendar_events IS 'Calendar events for scheduling consultations, production, and meetings';
COMMENT ON COLUMN public.calendar_events.event_type IS 'Type of event: consultation, production_materials, production_labor, adjuster_meeting, other';
COMMENT ON COLUMN public.calendar_events.is_all_day IS 'True if event is all-day (no specific start/end time)';
COMMENT ON COLUMN public.calendar_events.assigned_users IS 'Array of user IDs assigned to this event';
COMMENT ON COLUMN public.calendar_events.material_order_id IS 'Links to material order if auto-created from delivery date';
COMMENT ON COLUMN public.calendar_events.labor_order_id IS 'Links to labor order if auto-created from production dates';
COMMENT ON COLUMN public.calendar_events.related_event_id IS 'Links delivery event to labor event for same job';
COMMENT ON COLUMN public.calendar_events.recurrence_pattern IS 'JSON object defining recurrence rules (frequency, interval, end_date, etc.)';
