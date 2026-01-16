-- Add 'door_knocking' to leads source check constraint
-- Migration: 20260116000002_add_door_knocking_source

-- First, update any invalid source values to 'other'
UPDATE public.leads 
SET source = 'other' 
WHERE source NOT IN (
  'website',
  'referral',
  'google',
  'facebook',
  'instagram',
  'homeadvisor',
  'angi',
  'thumbtack',
  'yelp',
  'direct',
  'door_knocking',
  'other'
) OR source IS NULL;

-- Drop existing constraint
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;

-- Recreate constraint with door_knocking included
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check 
  CHECK (source IN (
    'website',
    'referral',
    'google',
    'facebook',
    'instagram',
    'homeadvisor',
    'angi',
    'thumbtack',
    'yelp',
    'direct',
    'door_knocking',
    'other'
  ));

-- Add comment
COMMENT ON CONSTRAINT leads_source_check ON public.leads IS 
  'Ensures lead source is one of the predefined valid sources including door_knocking';
