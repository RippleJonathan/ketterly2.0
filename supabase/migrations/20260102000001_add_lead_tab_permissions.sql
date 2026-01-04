-- Migration: Add Lead Tab-Level Permissions
-- Created: 2026-01-02
-- Purpose: Add granular permissions for each tab on the lead detail page

-- Add new permission columns to user_permissions table
ALTER TABLE public.user_permissions 
ADD COLUMN can_view_lead_details BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_checklist BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_measurements BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_estimates BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_orders BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_photos BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_notes BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_documents BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_payments BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_financials BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN can_view_lead_commissions BOOLEAN DEFAULT true NOT NULL;

-- Update existing records to grant all tab permissions by default
-- Admin, Office, Sales Manager, Sales, Production → See all tabs
UPDATE public.user_permissions SET
  can_view_lead_details = true,
  can_view_lead_checklist = true,
  can_view_lead_measurements = true,
  can_view_lead_estimates = true,
  can_view_lead_orders = true,
  can_view_lead_photos = true,
  can_view_lead_notes = true,
  can_view_lead_documents = true,
  can_view_lead_payments = true,
  can_view_lead_financials = true,
  can_view_lead_commissions = true;

-- Marketing role: Hide Orders, Payments, Financials, Commissions
UPDATE public.user_permissions up
SET
  can_view_lead_orders = false,
  can_view_lead_payments = false,
  can_view_lead_financials = false,
  can_view_lead_commissions = false
FROM public.users u
WHERE up.user_id = u.id 
  AND u.role = 'marketing'
  AND u.deleted_at IS NULL;

-- Add comment explaining the new permissions
COMMENT ON COLUMN public.user_permissions.can_view_lead_details IS 'Permission to view the Details tab on lead pages (contact info, status, etc.)';
COMMENT ON COLUMN public.user_permissions.can_view_lead_checklist IS 'Permission to view the Checklist tab on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_measurements IS 'Permission to view the Measurements tab on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_estimates IS 'Permission to view the Estimates tab on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_orders IS 'Permission to view the Orders tab (material/labor orders) on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_photos IS 'Permission to view the Photos tab on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_notes IS 'Permission to view the Notes & Activity tab on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_documents IS 'Permission to view the Documents tab on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_payments IS 'Permission to view the Invoice/Payments tab on lead pages';
COMMENT ON COLUMN public.user_permissions.can_view_lead_financials IS 'Permission to view the Financials tab on lead pages (profit margins, totals, etc.)';
COMMENT ON COLUMN public.user_permissions.can_view_lead_commissions IS 'Permission to view the Commissions tab on lead pages';
