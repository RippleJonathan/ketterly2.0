-- Sample Presentation Template for Testing
-- Run this SQL in Supabase SQL Editor to create a basic template

-- First, get your company_id and a user_id
-- SELECT id FROM companies LIMIT 1;
-- SELECT id FROM users LIMIT 1;

-- Replace these with actual IDs from your database:
DO $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_template_id UUID;
BEGIN
  -- Get the first company (adjust as needed)
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  -- Get a user from that company
  SELECT id INTO v_user_id FROM users WHERE company_id = v_company_id LIMIT 1;
  
  -- Create a sample template
  INSERT INTO presentation_templates (
    company_id,
    name,
    description,
    flow_type,
    is_active,
    created_by
  ) VALUES (
    v_company_id,
    'Standard Sales Presentation',
    'Professional presentation with company intro, pricing, and closing',
    'retail',
    true,
    v_user_id
  ) RETURNING id INTO v_template_id;
  
  -- Add slides to the template
  
  -- Slide 1: Company Introduction
  INSERT INTO presentation_slides (
    template_id,
    slide_order,
    slide_type,
    title,
    content,
    show_for_retail,
    show_for_insurance
  ) VALUES (
    v_template_id,
    1,
    'company_info',
    'Welcome',
    jsonb_build_object(
      'show_logo', true,
      'show_tagline', true,
      'show_contact', true,
      'tagline', 'Your Trusted Roofing Partner'
    ),
    true,
    true
  );
  
  -- Slide 2: Customer Information
  INSERT INTO presentation_slides (
    template_id,
    slide_order,
    slide_type,
    title,
    content,
    show_for_retail,
    show_for_insurance
  ) VALUES (
    v_template_id,
    2,
    'customer_info',
    'Your Project',
    jsonb_build_object(
      'show_name', true,
      'show_address', true,
      'show_contact', true,
      'show_property_details', true
    ),
    true,
    true
  );
  
  -- Slide 3: Static "Why Choose Us" slide
  INSERT INTO presentation_slides (
    template_id,
    slide_order,
    slide_type,
    title,
    content,
    show_for_retail,
    show_for_insurance
  ) VALUES (
    v_template_id,
    3,
    'static',
    'Why Choose Us',
    jsonb_build_object(
      'title', 'Why Choose Us',
      'body', '<ul style="text-align: left; max-width: 600px; margin: 0 auto; font-size: 1.25rem; line-height: 2;">
<li>✓ Licensed and Insured</li>
<li>✓ 20+ Years of Experience</li>
<li>✓ Lifetime Warranty</li>
<li>✓ Top-Rated Materials</li>
<li>✓ Local Family-Owned Business</li>
</ul>',
      'text_color', '#ffffff',
      'alignment', 'center'
    ),
    true,
    true
  );
  
  -- Slide 4: Interactive Pricing Grid (RETAIL ONLY)
  INSERT INTO presentation_slides (
    template_id,
    slide_order,
    slide_type,
    title,
    content,
    show_for_retail,
    show_for_insurance
  ) VALUES (
    v_template_id,
    4,
    'dynamic_pricing',
    'Choose Your Investment Level',
    jsonb_build_object(
      'title', 'Choose Your Investment Level',
      'subtitle', 'Select the option that best fits your needs and budget'
    ),
    true,
    false
  );
  
  -- Slide 5: Closing Slide
  INSERT INTO presentation_slides (
    template_id,
    slide_order,
    slide_type,
    title,
    content,
    show_for_retail,
    show_for_insurance
  ) VALUES (
    v_template_id,
    5,
    'closing',
    'Let''s Get Started',
    jsonb_build_object(
      'title', 'Ready to Protect Your Home?',
      'message', 'We''re excited to work with you! Let''s finalize the details and get your project scheduled.',
      'cta_text', 'Review Contract & Sign'
    ),
    true,
    true
  );
  
  RAISE NOTICE 'Sample template created with ID: %', v_template_id;
  RAISE NOTICE 'Template name: Standard Sales Presentation';
  RAISE NOTICE 'Slides created: 5';
  
END $$;

-- Verify the template was created
SELECT 
  t.id,
  t.name,
  t.flow_type,
  t.is_active,
  COUNT(s.id) as slide_count
FROM presentation_templates t
LEFT JOIN presentation_slides s ON s.template_id = t.id
WHERE t.name = 'Standard Sales Presentation'
GROUP BY t.id, t.name, t.flow_type, t.is_active;
