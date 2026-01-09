-- Add deleted_at column to customer_invoices table
-- This column is expected by auto_create_invoice_on_contract trigger

ALTER TABLE public.customer_invoices
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.customer_invoices.deleted_at IS 'Soft delete timestamp for customer invoices';

-- Also check invoice_line_items since it's referenced in the trigger
ALTER TABLE public.invoice_line_items
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.invoice_line_items.deleted_at IS 'Soft delete timestamp for invoice line items';
