-- Backfill location_id for existing users
-- This migration assigns users to locations based on your business logic

-- Option 1: Assign all users to the first location in each company
UPDATE public.users u
SET location_id = (
  SELECT l.id 
  FROM public.locations l 
  WHERE l.company_id = u.company_id 
  ORDER BY l.created_at ASC 
  LIMIT 1
)
WHERE location_id IS NULL;

-- Option 2 (commented out): If you want to manually assign specific users to specific locations
-- UPDATE public.users SET location_id = 'your-location-uuid' WHERE email = 'user@example.com';

-- Verify the update
-- SELECT u.full_name, u.email, u.location_id, l.name as location_name
-- FROM users u
-- LEFT JOIN locations l ON u.location_id = l.id
-- ORDER BY u.full_name;
