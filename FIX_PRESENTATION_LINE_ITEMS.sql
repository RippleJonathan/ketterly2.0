-- MIGRATION: Add line items to presentation deck
-- Run this in Supabase Dashboard SQL Editor
-- ================================================

CREATE OR REPLACE FUNCTION get_presentation_deck(
  p_template_id UUID,
  p_lead_id UUID,
  p_flow_type TEXT,
  p_estimate_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deck JSONB;
  v_customer_data JSONB;
  v_estimate_data JSONB;
  v_company_data JSONB;
BEGIN
  -- Get customer data from lead
  SELECT jsonb_build_object(
    'name', full_name,
    'full_name', full_name,
    'email', email,
    'phone', phone,
    'address', address,
    'service_address', address,
    'city', city,
    'service_city', city,
    'state', state,
    'service_state', state,
    'zip', zip,
    'service_zip', zip,
    'property_type', NULL,
    'square_footage', NULL
  ) INTO v_customer_data
  FROM leads
  WHERE id = p_lead_id;

  -- Get company data
  SELECT jsonb_build_object(
    'name', c.name,
    'logo_url', c.logo_url,
    'primary_color', c.primary_color,
    'email', c.contact_email,
    'phone', c.contact_phone,
    'address', c.address || COALESCE(', ' || c.city, '') || COALESCE(', ' || c.state, '') || COALESCE(' ' || c.zip, '')
  ) INTO v_company_data
  FROM leads l
  JOIN companies c ON c.id = l.company_id
  WHERE l.id = p_lead_id;

  -- Get estimate data with line items if provided (from quotes table)
  IF p_estimate_ids IS NOT NULL AND array_length(p_estimate_ids, 1) > 0 THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'quote_number', q.quote_number,
        'subtotal', q.subtotal,
        'tax', q.tax_amount,
        'total', q.total,
        'price_good', q.total,
        'price_better', q.total,
        'price_best', q.total,
        'line_items', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', qli.id,
              'description', qli.description,
              'quantity', qli.quantity,
              'unit_price', qli.unit_price,
              'total', qli.line_total,
              'category', qli.category,
              'notes', qli.notes,
              'sort_order', qli.sort_order
            ) ORDER BY qli.sort_order
          ), '[]'::jsonb)
          FROM quote_line_items qli
          WHERE qli.quote_id = q.id
        )
      )
    ) INTO v_estimate_data
    FROM quotes q
    WHERE q.id = ANY(p_estimate_ids);
  END IF;

  -- Build the deck
  SELECT jsonb_build_object(
    'template_id', pt.id,
    'template_name', pt.name,
    'flow_type', p_flow_type,
    'customer_data', v_customer_data,
    'estimates', COALESCE(v_estimate_data, '[]'::jsonb),
    'company_name', (v_company_data->>'name'),
    'company_logo_url', (v_company_data->>'logo_url'),
    'company_primary_color', (v_company_data->>'primary_color'),
    'company_email', (v_company_data->>'email'),
    'company_phone', (v_company_data->>'phone'),
    'company_address', (v_company_data->>'address'),
    'slides', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ps.id,
          'title', ps.title,
          'slide_type', ps.slide_type,
          'content', ps.content,
          'action_button', CASE 
            WHEN ps.action_button_enabled THEN jsonb_build_object(
              'enabled', true,
              'label', ps.action_button_label,
              'type', ps.action_button_type,
              'config', ps.action_button_config
            )
            ELSE jsonb_build_object('enabled', false)
          END
        ) ORDER BY ps.slide_order
      )
      FROM presentation_slides ps
      WHERE ps.template_id = p_template_id
        AND (
          (p_flow_type = 'retail' AND ps.show_for_retail = true)
          OR (p_flow_type = 'insurance' AND ps.show_for_insurance = true)
        )
        AND (
          ps.requires_estimates = false
          OR (ps.requires_estimates = true AND p_estimate_ids IS NOT NULL)
        )
    )
  ) INTO v_deck
  FROM presentation_templates pt
  WHERE pt.id = p_template_id;

  RETURN v_deck;
END;
$$;
