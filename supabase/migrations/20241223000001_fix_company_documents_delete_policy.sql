-- =====================================================================
-- Fix Company Documents Delete - Switch to Hard Delete
-- Issue: UPDATE policies are failing, even with USING/WITH CHECK (true)
-- Solution: Use hard DELETE instead of soft delete
-- Updated: 2024-12-23 (v9)
-- =====================================================================

-- Create DELETE policy for company documents
-- Users can delete documents from their own company
CREATE POLICY "company_users_delete_documents"
  ON public.company_documents
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );
