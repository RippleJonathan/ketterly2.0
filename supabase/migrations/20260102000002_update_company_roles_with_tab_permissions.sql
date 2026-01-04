-- Migration: Update company_roles table with tab-level permissions
-- Created: 2026-01-02
-- Purpose: Add the 11 new tab permission fields to all company_roles records

-- Update marketing role to hide 4 tabs
UPDATE public.company_roles
SET permissions = permissions || jsonb_build_object(
  'can_view_lead_details', true,
  'can_view_lead_checklist', true,
  'can_view_lead_measurements', true,
  'can_view_lead_estimates', true,
  'can_view_lead_orders', false,
  'can_view_lead_photos', true,
  'can_view_lead_notes', true,
  'can_view_lead_documents', true,
  'can_view_lead_payments', false,
  'can_view_lead_financials', false,
  'can_view_lead_commissions', false
)
WHERE role_name = 'marketing'
  AND deleted_at IS NULL;

-- Update all other roles to see all tabs
UPDATE public.company_roles
SET permissions = permissions || jsonb_build_object(
  'can_view_lead_details', true,
  'can_view_lead_checklist', true,
  'can_view_lead_measurements', true,
  'can_view_lead_estimates', true,
  'can_view_lead_orders', true,
  'can_view_lead_photos', true,
  'can_view_lead_notes', true,
  'can_view_lead_documents', true,
  'can_view_lead_payments', true,
  'can_view_lead_financials', true,
  'can_view_lead_commissions', true
)
WHERE role_name != 'marketing'
  AND deleted_at IS NULL;

-- Verify the changes
SELECT role_name, 
       permissions->'can_view_lead_orders' as orders,
       permissions->'can_view_lead_payments' as payments,
       permissions->'can_view_lead_financials' as financials,
       permissions->'can_view_lead_commissions' as commissions
FROM public.company_roles
WHERE deleted_at IS NULL
ORDER BY role_name;
