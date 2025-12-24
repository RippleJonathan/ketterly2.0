# Document Builder Implementation Plan

**Status**: In Progress  
**Approach**: Hybrid - Pre-built Templates + Simple Section Editor  
**Estimated Time**: 2-3 days

---

## Overview

Build a document template system that allows users to:
1. Start with pre-built templates (Contract, Work Order, Proposal)
2. Edit sections (add/remove, modify text, insert variables)
3. Preview document with real data
4. Generate PDF
5. Send for eSignature
6. Save as custom template for reuse

---

## Core Concepts

### Document Structure
A document consists of **Sections** that can be:
- **Added/Removed** (drag to reorder)
- **Edited** (click to edit text, insert variables)
- **Styled** (optional: background, borders)

### Variable System
Dynamic placeholders that auto-fill from lead/quote data:
- `{{customer_name}}`
- `{{property_address}}`
- `{{quote_total}}`
- `{{today}}`
- `{{company_name}}`

### Section Types
- **Header**: Company logo, title, date
- **Text Block**: Paragraph, heading, bullet list
- **Customer Info**: Name, address, contact
- **Pricing Table**: Line items from quote
- **Terms & Conditions**: Legal text
- **Signature Block**: Customer + Company signatures
- **Custom Section**: User-defined content

---

## Database Schema

### Table: `document_templates`

```sql
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'contract', 'work_order', 'proposal', 'invoice', 'custom'
  
  -- Document structure (array of sections)
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_global BOOLEAN DEFAULT false NOT NULL, -- Platform-wide templates
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Page settings
  page_size TEXT DEFAULT 'letter', -- 'letter', 'a4'
  margins JSONB DEFAULT '{"top": 0.75, "right": 0.75, "bottom": 0.75, "left": 0.75}'::jsonb,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_document_templates_company_id ON document_templates(company_id);
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_document_templates_global ON document_templates(is_global, is_active);

-- RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their company's templates + global templates
CREATE POLICY "users_view_document_templates"
  ON document_templates
  FOR SELECT
  USING (
    (is_global = true AND is_active = true AND deleted_at IS NULL)
    OR (company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    ) AND deleted_at IS NULL)
  );

-- Users can create templates for their company
CREATE POLICY "users_create_document_templates"
  ON document_templates
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update their company's templates
CREATE POLICY "users_update_document_templates"
  ON document_templates
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete their company's templates
CREATE POLICY "users_delete_document_templates"
  ON document_templates
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

### Table: `generated_documents`

```sql
CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  
  -- Linked entities
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Document details
  title TEXT NOT NULL,
  document_number TEXT, -- e.g., 'CONTRACT-2024-001'
  
  -- Content (final rendered sections with data filled in)
  sections JSONB NOT NULL,
  
  -- Generated files
  pdf_url TEXT, -- Supabase Storage URL
  pdf_generated_at TIMESTAMPTZ,
  
  -- eSignature tracking
  status TEXT DEFAULT 'draft' NOT NULL, -- 'draft', 'sent', 'pending_signatures', 'signed', 'declined', 'voided'
  
  -- Customer signature
  customer_signature_data TEXT,
  customer_signature_ip TEXT,
  customer_signed_at TIMESTAMPTZ,
  customer_signed_by_name TEXT,
  customer_signed_by_email TEXT,
  
  -- Company signature
  company_signature_data TEXT,
  company_signature_ip TEXT,
  company_signed_at TIMESTAMPTZ,
  company_signed_by UUID REFERENCES users(id),
  
  -- Sharing
  share_token TEXT UNIQUE,
  share_link_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'pending_signatures', 'signed', 'declined', 'voided'))
);

-- Indexes
CREATE INDEX idx_generated_documents_company_id ON generated_documents(company_id);
CREATE INDEX idx_generated_documents_lead_id ON generated_documents(lead_id);
CREATE INDEX idx_generated_documents_quote_id ON generated_documents(quote_id);
CREATE INDEX idx_generated_documents_status ON generated_documents(status);
CREATE INDEX idx_generated_documents_share_token ON generated_documents(share_token) WHERE share_token IS NOT NULL;

-- RLS
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their company's documents
CREATE POLICY "users_view_generated_documents"
  ON generated_documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR (share_token IS NOT NULL AND deleted_at IS NULL)
  );

-- Users can create documents for their company
CREATE POLICY "users_create_generated_documents"
  ON generated_documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update their company's documents
CREATE POLICY "users_update_generated_documents"
  ON generated_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete their company's documents
CREATE POLICY "users_delete_generated_documents"
  ON generated_documents
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## TypeScript Types

```typescript
// lib/types/document-builder.ts

export type DocumentCategory = 'contract' | 'work_order' | 'proposal' | 'invoice' | 'custom'
export type DocumentStatus = 'draft' | 'sent' | 'pending_signatures' | 'signed' | 'declined' | 'voided'

export type SectionType = 
  | 'header'
  | 'text'
  | 'customer_info'
  | 'pricing_table'
  | 'terms'
  | 'signatures'
  | 'custom'

export interface DocumentSection {
  id: string
  type: SectionType
  title?: string
  content: SectionContent
  settings?: SectionSettings
}

export interface SectionContent {
  // Text sections
  text?: string // HTML content
  
  // Customer info
  fields?: Array<{
    label: string
    variable: string
    format?: 'text' | 'currency' | 'date' | 'phone' | 'email'
  }>
  
  // Pricing table
  showLineItems?: boolean
  showSubtotal?: boolean
  showTax?: boolean
  showTotal?: boolean
  customColumns?: string[]
  
  // Signatures
  signers?: Array<{
    type: 'customer' | 'company'
    label: string
    showDate: boolean
    showName: boolean
  }>
  
  // Custom sections
  customContent?: any
}

export interface SectionSettings {
  backgroundColor?: string
  borderTop?: boolean
  borderBottom?: boolean
  padding?: string
  textAlign?: 'left' | 'center' | 'right'
}

export interface DocumentTemplate {
  id: string
  company_id: string | null
  name: string
  description: string | null
  category: DocumentCategory
  sections: DocumentSection[]
  is_global: boolean
  is_active: boolean
  page_size: 'letter' | 'a4'
  margins: { top: number; right: number; bottom: number; left: number }
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GeneratedDocument {
  id: string
  company_id: string
  template_id: string | null
  lead_id: string | null
  quote_id: string | null
  project_id: string | null
  title: string
  document_number: string | null
  sections: DocumentSection[]
  pdf_url: string | null
  pdf_generated_at: string | null
  status: DocumentStatus
  customer_signature_data: string | null
  customer_signature_ip: string | null
  customer_signed_at: string | null
  customer_signed_by_name: string | null
  customer_signed_by_email: string | null
  company_signature_data: string | null
  company_signature_ip: string | null
  company_signed_at: string | null
  company_signed_by: string | null
  share_token: string | null
  share_link_expires_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GeneratedDocumentWithRelations extends GeneratedDocument {
  lead?: { full_name: string; email: string }
  quote?: { quote_number: string; total: number }
  template?: { name: string; category: string }
  creator?: { full_name: string }
}

// Variable definitions
export const DOCUMENT_VARIABLES = {
  // Company
  'company.name': { label: 'Company Name', category: 'Company' },
  'company.address': { label: 'Company Address', category: 'Company' },
  'company.phone': { label: 'Company Phone', category: 'Company' },
  'company.email': { label: 'Company Email', category: 'Company' },
  
  // Customer/Lead
  'customer.name': { label: 'Customer Name', category: 'Customer' },
  'customer.email': { label: 'Customer Email', category: 'Customer' },
  'customer.phone': { label: 'Customer Phone', category: 'Customer' },
  'customer.address': { label: 'Property Address', category: 'Customer' },
  'customer.city': { label: 'City', category: 'Customer' },
  'customer.state': { label: 'State', category: 'Customer' },
  'customer.zip': { label: 'ZIP Code', category: 'Customer' },
  
  // Quote/Project
  'quote.number': { label: 'Quote Number', category: 'Quote' },
  'quote.subtotal': { label: 'Subtotal', category: 'Quote', format: 'currency' },
  'quote.tax': { label: 'Tax Amount', category: 'Quote', format: 'currency' },
  'quote.total': { label: 'Total Amount', category: 'Quote', format: 'currency' },
  'quote.created_date': { label: 'Quote Date', category: 'Quote', format: 'date' },
  
  // Dates
  'today': { label: 'Today\'s Date', category: 'System', format: 'date' },
  'current_year': { label: 'Current Year', category: 'System' },
} as const
```

---

## Pre-built Templates

### Template 1: Basic Contract

```typescript
const CONTRACT_TEMPLATE: DocumentSection[] = [
  {
    id: 'header',
    type: 'header',
    content: {
      text: `
        <div style="text-align: center;">
          <h1>{{company.name}}</h1>
          <h2>Roofing Services Contract</h2>
          <p>Contract Date: {{today}}</p>
        </div>
      `
    },
    settings: {
      borderBottom: true,
      padding: '1rem'
    }
  },
  {
    id: 'customer-info',
    type: 'customer_info',
    title: 'Customer Information',
    content: {
      fields: [
        { label: 'Customer Name', variable: 'customer.name' },
        { label: 'Property Address', variable: 'customer.address' },
        { label: 'Phone', variable: 'customer.phone', format: 'phone' },
        { label: 'Email', variable: 'customer.email', format: 'email' },
      ]
    }
  },
  {
    id: 'scope',
    type: 'text',
    title: 'Scope of Work',
    content: {
      text: `
        <p>The Contractor agrees to provide the following roofing services:</p>
        <ul>
          <li>Complete roof replacement</li>
          <li>Removal and disposal of old roofing materials</li>
          <li>Installation of new roofing system as specified</li>
          <li>Clean-up of work area upon completion</li>
        </ul>
      `
    }
  },
  {
    id: 'pricing',
    type: 'pricing_table',
    title: 'Pricing',
    content: {
      showLineItems: true,
      showSubtotal: true,
      showTax: true,
      showTotal: true
    }
  },
  {
    id: 'terms',
    type: 'terms',
    title: 'Terms & Conditions',
    content: {
      text: `
        <h3>Payment Terms</h3>
        <p>50% deposit due upon signing, remaining balance due upon completion.</p>
        
        <h3>Warranty</h3>
        <p>All work is warranted for 1 year from completion date.</p>
        
        <h3>Cancellation</h3>
        <p>Customer may cancel within 3 business days of signing for a full refund.</p>
      `
    }
  },
  {
    id: 'signatures',
    type: 'signatures',
    title: 'Signatures',
    content: {
      signers: [
        {
          type: 'customer',
          label: 'Customer Signature',
          showDate: true,
          showName: true
        },
        {
          type: 'company',
          label: 'Authorized Representative',
          showDate: true,
          showName: true
        }
      ]
    }
  }
]
```

### Template 2: Work Order

### Template 3: Proposal

---

## Implementation Phases

### Phase 1: Database & Seed Templates (4 hours)
- [ ] Create migration with both tables
- [ ] Add RLS policies
- [ ] Create TypeScript types
- [ ] Seed 3 global templates

### Phase 2: Template Management UI (4 hours)
- [ ] Templates list page (`/admin/documents/templates`)
- [ ] Template preview
- [ ] Duplicate template feature
- [ ] Delete template

### Phase 3: Section Editor (6 hours)
- [ ] Document builder UI
- [ ] Add/remove sections
- [ ] Drag to reorder sections
- [ ] Edit section content (TipTap or Quill rich text)
- [ ] Insert variable dropdown
- [ ] Live preview panel
- [ ] Save custom template

### Phase 4: PDF Generation (4 hours)
- [ ] Render sections to HTML
- [ ] Variable replacement
- [ ] Puppeteer PDF generation
- [ ] Save to Supabase Storage

### Phase 5: eSignature Flow (6 hours)
- [ ] Generate share link
- [ ] Public signature page (`/sign/[token]`)
- [ ] Signature pad component
- [ ] Save signatures
- [ ] Email notification on signing
- [ ] View signed document

---

## File Structure

```
app/
├── (admin)/admin/
│   └── documents/
│       ├── builder/
│       │   ├── page.tsx                    # Template builder
│       │   └── [id]/
│       │       └── page.tsx                # Edit template
│       ├── generated/
│       │   ├── page.tsx                    # Generated documents list
│       │   └── [id]/
│       │       └── page.tsx                # View/edit generated doc
│       └── templates/
│           └── page.tsx                    # Browse templates
│
└── (public)/
    └── sign/
        └── [token]/
            └── page.tsx                    # Customer signature page

components/admin/document-builder/
├── template-builder.tsx                    # Main builder component
├── section-editor/
│   ├── section-list.tsx                    # Drag-drop section list
│   ├── section-editor.tsx                  # Edit section content
│   ├── section-types/
│   │   ├── header-section.tsx
│   │   ├── text-section.tsx
│   │   ├── customer-info-section.tsx
│   │   ├── pricing-table-section.tsx
│   │   ├── terms-section.tsx
│   │   └── signature-section.tsx
│   └── variable-picker.tsx                 # Insert variable dropdown
├── document-preview.tsx                    # Live preview
└── section-toolbar.tsx                     # Add section button

components/public/
└── signature-page.tsx                      # Customer-facing signature page

lib/
├── api/
│   ├── document-templates.ts               # Template CRUD
│   └── generated-documents.ts              # Generated doc CRUD
├── hooks/
│   ├── use-document-templates.ts
│   └── use-generated-documents.ts
└── utils/
    ├── document-variables.ts               # Variable replacement
    └── generate-document-pdf.ts            # PDF generation
```

---

## Next Steps

1. **Create database migration**
2. **Seed 3 templates**
3. **Build template list UI**
4. **Build section editor**
5. **Test workflow: Template → Generate → Sign**

---

**Ready to start!** 🚀
