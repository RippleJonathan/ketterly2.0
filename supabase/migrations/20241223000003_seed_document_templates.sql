-- =====================================================================
-- Seed Document Builder Templates
-- Creates 1 basic contract template as a starting point
-- =====================================================================

-- Basic Contract Template (Global)
INSERT INTO public.document_templates (
  id,
  company_id,
  name,
  description,
  category,
  is_global,
  is_active,
  sections
) VALUES (
  gen_random_uuid(),
  NULL, -- Global template
  'Basic Contract',
  'Simple contract template with company header, content sections, and signature block',
  'contract',
  true,
  true,
  '[
    {
      "id": "header",
      "type": "header",
      "title": "Header",
      "content": {
        "text": "<div style=\"text-align: center; margin-bottom: 2rem;\"><h1>{{company.name}}</h1><p>{{company.address}}<br/>{{company.city}}, {{company.state}} {{company.zip}}<br/>Phone: {{company.phone}} | Email: {{company.email}}</p><hr style=\"margin: 1.5rem 0;\"/><h2 style=\"margin-top: 1.5rem;\">Service Agreement</h2><p>Date: {{today}}</p></div>"
      },
      "settings": {
        "borderBottom": true,
        "padding": "1rem"
      }
    },
    {
      "id": "customer-info",
      "type": "customer_info",
      "title": "Customer Information",
      "content": {
        "fields": [
          {
            "label": "Customer Name",
            "variable": "customer.name",
            "format": "text"
          },
          {
            "label": "Property Address",
            "variable": "customer.address",
            "format": "text"
          },
          {
            "label": "City, State ZIP",
            "variable": "customer.city",
            "format": "text"
          },
          {
            "label": "Phone",
            "variable": "customer.phone",
            "format": "phone"
          },
          {
            "label": "Email",
            "variable": "customer.email",
            "format": "email"
          }
        ]
      },
      "settings": {
        "padding": "1rem",
        "borderBottom": true
      }
    },
    {
      "id": "scope",
      "type": "text",
      "title": "Scope of Work",
      "content": {
        "text": "<p>The service provider agrees to perform the following work:</p><p><br/></p><p><em>Click to edit this section and describe the work to be performed...</em></p>"
      },
      "settings": {
        "padding": "1rem"
      }
    },
    {
      "id": "pricing",
      "type": "pricing_table",
      "title": "Pricing",
      "content": {
        "showLineItems": true,
        "showSubtotal": true,
        "showTax": true,
        "showTotal": true
      },
      "settings": {
        "padding": "1rem",
        "borderTop": true,
        "borderBottom": true
      }
    },
    {
      "id": "terms",
      "type": "text",
      "title": "Terms & Conditions",
      "content": {
        "text": "<h3>Payment Terms</h3><p>Payment terms to be agreed upon...</p><h3>Warranty</h3><p>Warranty information...</p><h3>Additional Terms</h3><p>Any additional terms and conditions...</p>"
      },
      "settings": {
        "padding": "1rem"
      }
    },
    {
      "id": "signatures",
      "type": "signatures",
      "title": "Signatures",
      "content": {
        "signers": [
          {
            "type": "customer",
            "label": "Customer Signature",
            "showDate": true,
            "showName": true
          },
          {
            "type": "company",
            "label": "Company Representative",
            "showDate": true,
            "showName": true
          }
        ]
      },
      "settings": {
        "padding": "2rem 1rem",
        "borderTop": true
      }
    }
  ]'::jsonb
);

-- Add comment
COMMENT ON TABLE public.document_templates IS 'Document templates can be duplicated and customized per company. Sections can be added, removed, or reordered to build custom documents.';
