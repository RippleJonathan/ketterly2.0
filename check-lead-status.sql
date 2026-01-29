-- Check if lead exists and its deletion status
SELECT 
  id,
  full_name,
  status,
  company_id,
  deleted_at,
  CASE 
    WHEN deleted_at IS NOT NULL THEN 'SOFT DELETED'
    ELSE 'ACTIVE'
  END as current_status
FROM leads 
WHERE id = '26283ea6-ec47-49f0-99d3-4b0868849d78';

-- If you want to restore this lead (remove soft delete):
-- UPDATE leads SET deleted_at = NULL WHERE id = '26283ea6-ec47-49f0-99d3-4b0868849d78';
