-- Migration: Update lead status values
-- Date: 2024-11-29
-- Description: Replace 'lost' with 'invoiced' and add 'closed' status to lead pipeline

-- Drop the existing CHECK constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add the new CHECK constraint with updated status values
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'contacted', 'qualified', 'quote_sent', 'follow_up', 'won', 'invoiced', 'closed', 'lost', 'archived'));

-- Optional: Update any existing 'lost' records to a default status if needed
-- UPDATE leads SET status = 'archived' WHERE status = 'lost';
