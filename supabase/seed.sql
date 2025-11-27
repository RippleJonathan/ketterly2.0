-- =====================================================
-- KETTERLY CRM - SEED DATA
-- Description: Initial seed data for development
-- =====================================================

-- Insert first tenant company (Ripple Roofing & Construction)
INSERT INTO public.companies (
  id,
  name,
  slug,
  contact_email,
  contact_phone,
  address,
  city,
  state,
  zip,
  subscription_tier,
  subscription_status,
  onboarding_completed,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Ripple Roofing & Construction',
  'ripple-roofing',
  'info@rippleroofing.com',
  '555-0100',
  '123 Main Street',
  'Anytown',
  'TX',
  '75001',
  'professional',
  'active',
  true,
  NOW(),
  NOW()
);

-- Note: Users will be created through the signup flow
-- The first user who signs up for Ripple Roofing will be linked to this company
-- and granted super_admin role

-- Sample lead data for testing (optional - remove in production)
INSERT INTO public.leads (
  company_id,
  full_name,
  email,
  phone,
  address,
  city,
  state,
  zip,
  source,
  service_type,
  status,
  priority,
  estimated_value,
  notes
) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'John Smith',
  'john.smith@example.com',
  '555-0101',
  '456 Oak Avenue',
  'Anytown',
  'TX',
  '75002',
  'website',
  'replacement',
  'new',
  'high',
  15000.00,
  'Customer interested in full roof replacement. Hail damage from recent storm.'
),
(
  'a0000000-0000-0000-0000-000000000001',
  'Sarah Johnson',
  'sarah.j@example.com',
  '555-0102',
  '789 Elm Street',
  'Anytown',
  'TX',
  '75003',
  'referral',
  'repair',
  'contacted',
  'medium',
  2500.00,
  'Minor leak in attic. Referred by previous customer.'
),
(
  'a0000000-0000-0000-0000-000000000001',
  'Mike Davis',
  'mdavis@example.com',
  '555-0103',
  '321 Pine Road',
  'Anytown',
  'TX',
  '75004',
  'google',
  'inspection',
  'qualified',
  'low',
  500.00,
  'Pre-purchase home inspection needed.'
);
