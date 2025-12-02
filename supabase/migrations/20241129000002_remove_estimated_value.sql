-- Remove estimated_value column from leads table
-- This field is not needed in the initial version

ALTER TABLE leads DROP COLUMN IF EXISTS estimated_value;
