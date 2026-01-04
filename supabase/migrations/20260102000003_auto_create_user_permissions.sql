-- Migration: Auto-create user_permissions from company_roles
-- Created: 2026-01-02
-- Purpose: Database trigger to automatically create user_permissions when a user is created

-- Create function to auto-create user permissions
-- Simplified version: Let the API handle full permissions, trigger handles tab permissions only
CREATE OR REPLACE FUNCTION public.create_user_permissions_from_role()
RETURNS TRIGGER AS $$
DECLARE
  role_permissions JSONB;
BEGIN
  -- Get permissions from company_roles for this user's role
  SELECT permissions INTO role_permissions
  FROM public.company_roles
  WHERE company_id = NEW.company_id
    AND role_name = NEW.role
    AND deleted_at IS NULL
  LIMIT 1;

  -- If role permissions found AND user_permissions doesn't exist yet, create minimal record
  -- The API will handle the full permissions via upsert
  IF role_permissions IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions WHERE user_id = NEW.id
  ) THEN
    -- Just create a placeholder record - the API upsert will fill in all permissions
    -- We only set tab permissions here to ensure they're correct
    INSERT INTO public.user_permissions (
      user_id,
      can_view_lead_details,
      can_view_lead_checklist,
      can_view_lead_measurements,
      can_view_lead_estimates,
      can_view_lead_orders,
      can_view_lead_photos,
      can_view_lead_notes,
      can_view_lead_documents,
      can_view_lead_payments,
      can_view_lead_financials,
      can_view_lead_commissions
    ) VALUES (
      NEW.id,
      COALESCE((role_permissions->>'can_view_lead_details')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_checklist')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_measurements')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_estimates')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_orders')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_photos')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_notes')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_documents')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_payments')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_financials')::boolean, true),
      COALESCE((role_permissions->>'can_view_lead_commissions')::boolean, true)
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create user_permissions for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after user insert
DROP TRIGGER IF EXISTS trigger_create_user_permissions ON public.users;
CREATE TRIGGER trigger_create_user_permissions
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_permissions_from_role();

-- Backfill existing users without permissions
INSERT INTO public.user_permissions (
  user_id,
  can_view_lead_details,
  can_view_lead_checklist,
  can_view_lead_measurements,
  can_view_lead_estimates,
  can_view_lead_orders,
  can_view_lead_photos,
  can_view_lead_notes,
  can_view_lead_documents,
  can_view_lead_payments,
  can_view_lead_financials,
  can_view_lead_commissions
)
SELECT 
  u.id,
  -- Marketing role: hide 4 tabs, others: show all
  COALESCE((cr.permissions->>'can_view_lead_details')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_checklist')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_measurements')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_estimates')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_orders')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_photos')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_notes')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_documents')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_payments')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_financials')::boolean, true),
  COALESCE((cr.permissions->>'can_view_lead_commissions')::boolean, true)
FROM public.users u
LEFT JOIN public.company_roles cr ON cr.company_id = u.company_id AND cr.role_name = u.role AND cr.deleted_at IS NULL
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up WHERE up.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Verify results
SELECT 
  u.full_name,
  u.role,
  up.can_view_lead_orders,
  up.can_view_lead_payments,
  up.can_view_lead_financials,
  up.can_view_lead_commissions
FROM public.users u
LEFT JOIN public.user_permissions up ON up.user_id = u.id
WHERE u.deleted_at IS NULL
ORDER BY u.role, u.full_name;
