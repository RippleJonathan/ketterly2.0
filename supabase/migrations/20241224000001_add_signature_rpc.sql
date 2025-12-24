-- =====================================================================
-- Add RPC function to save customer signature
-- This allows public access (no auth required) for signing documents
-- =====================================================================

CREATE OR REPLACE FUNCTION public.save_customer_signature(
  p_document_id UUID,
  p_signature_data TEXT,
  p_name TEXT,
  p_email TEXT,
  p_ip TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.generated_documents
  SET
    customer_signature_data = p_signature_data,
    customer_signed_by_name = p_name,
    customer_signed_by_email = p_email,
    customer_signature_ip = p_ip,
    customer_signed_at = NOW(),
    status = 'signed',
    updated_at = NOW()
  WHERE id = p_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users (for public signature page)
GRANT EXECUTE ON FUNCTION public.save_customer_signature(UUID, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.save_customer_signature(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.save_customer_signature IS 'Allows customers to sign documents via public link without authentication';
