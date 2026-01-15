-- Add parent_activity_id column to activities table for threaded notes
-- Migration: add_parent_activity_id_to_activities

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS parent_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL;

-- Add index for faster lookups of replies
CREATE INDEX IF NOT EXISTS idx_activities_parent_activity_id 
ON public.activities(parent_activity_id) 
WHERE parent_activity_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.activities.parent_activity_id IS 'Reference to parent activity for threaded notes/replies';
