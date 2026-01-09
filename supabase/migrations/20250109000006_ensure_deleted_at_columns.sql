-- Ensure deleted_at column exists on all commission-related tables
-- Even though lead_commissions migration shows it should exist, 
-- this ensures it's there for the auto-commission workflow

ALTER TABLE public.lead_commissions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.lead_commissions.deleted_at IS 'Soft delete timestamp for lead commissions';

-- Also verify quote_line_items has it (used in invoice auto-creation)
ALTER TABLE public.quote_line_items
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.quote_line_items.deleted_at IS 'Soft delete timestamp for quote line items';
