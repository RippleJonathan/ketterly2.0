-- Check current contact_email values
SELECT id, name, contact_email FROM companies;

-- Update contact_email to use ketterly.com
UPDATE companies
SET contact_email = 'notifications@ketterly.com'
WHERE contact_email IS NOT NULL;

-- Verify the update
SELECT id, name, contact_email FROM companies;