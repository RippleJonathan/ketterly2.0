-- =============================================
-- FIX: Prevent auto-acceptance, require both signatures
-- =============================================

-- Disable the old auto-accept trigger that conflicts with dual-signature flow
DROP TRIGGER IF EXISTS on_quote_accepted ON public.quotes;

-- The populate_project_fields_from_quote function should only run when status is ALREADY 'accepted'
-- Not when it transitions to accepted (that's handled by signature triggers now)

-- Update sign-pdf route to NOT set status to 'accepted' directly
-- The trigger will handle status changes based on signatures

COMMENT ON FUNCTION handle_quote_acceptance() IS 'Manages quote status based on customer and company signatures. Only marks as accepted when BOTH signatures exist.';
