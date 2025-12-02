# Phase 2: Quotes & Project Management System

**Goal**: Build a complete quote-to-cash workflow - from generating estimates to managing active jobs to collecting final payments.

**Duration**: ~6-8 weeks  
**Prerequisites**: Phase 1 complete (Lead Management with multi-stage workflow)  
**Current Status**: 🟢 **Week 1-2 COMPLETED** - Quote Generation System with PDF Export

---

## ✅ Completed Features (As of November 30, 2024)

### Week 1-2: Quote Generation System ✅

**✅ Database & API**
- Quote database schema implemented
- Quote line items with categories (Labor, Materials, Permits, Equipment, Other)
- Auto-generation of quote numbers (Q-YYYY-###)
- Pricing calculations (subtotal, tax, discount, total)
- API functions: `createQuote`, `updateQuote`, `getQuotes`, `getQuote`
- React Query hooks for quote management
- Auto-create customer from lead when creating quote

**✅ Quote Builder UI**
- Quote form integrated into lead detail page (Estimates tab)
- Line item builder with drag-to-reorder
- Real-time totals calculation
- Tax rate configuration (defaults to 0% for Texas residential)
- Discount support
- Payment terms and notes
- Valid until date picker
- Multiple line items with categories

**✅ PDF Generation**
- Professional PDF templates using @react-pdf/renderer
- Company branding (logo, name, contact info)
- Customer information from lead
- Line items table with border
- Totals breakdown (subtotal, tax, discount, total)
- Payment terms section (boxed styling)
- Contract terms & conditions (plain text, no box)
- Signature section
- Download functionality
- Auto-save to Supabase Storage

**✅ Settings Management**
- Company settings page (`/admin/settings`)
- General tab: company info (name, address, phone, email, logo)
- Contract Terms tab: customizable legal terms
- Default template with placeholders
- Real-time save and data persistence
- RLS policies updated to allow company users to update their own settings

**✅ Type System**
- Complete database types for all tables
- Removed deprecated `title` field from quotes (using `option_label` instead)
- Proper TypeScript typing throughout
- No `any` casts in production code

**🔧 Bug Fixes & Improvements**
- Fixed RLS policy blocking company updates
- Fixed null value handling in company address formatting
- Fixed quote line items not displaying in PDFs
- Fixed settings data not persisting after save
- Added contract terms to company type definitions
- Improved PDF styling (bordered table, clean contract terms)

---

## Overview

Phase 2 transforms qualified leads into paying customers by building:

1. **Quote System** - Professional line-item estimates with multiple options, PDF generation, and e-signature
2. **Project Management** - Job tracking with crew scheduling, material orders, photo documentation, and task checklists
3. **Invoice & Payment Tracking** - Progress billing, invoice generation, payment tracking, and financial reporting

By the end of this phase, you'll have a **complete CRM** that handles every step from lead → quote → project → invoice → payment.

---

## Current State (From roof.link)

Understanding your existing workflow:
- **Quote Tool**: Line-item pricing with multiple options
- **Contracts**: E-signature capability
- **Projects**: Job tracking with crews
- **Materials**: Tracking orders and costs
- **Invoicing**: Progress payments and final invoice

**Goal**: Replace roof.link entirely with Ketterly CRM + add improvements

---

## Phase 2 Architecture

### ✨ Unified Lead/Project Model

**KEY DESIGN DECISION**: We're NOT creating a separate `projects` table. Instead, we extend the existing `leads` table with project-related fields. This keeps all customer data in one place throughout the entire lifecycle.

**Benefits**:
- Single source of truth for each customer
- No data duplication
- Continuous activity timeline from first contact → final payment
- Simpler navigation (no switching between "Leads" and "Projects")
- Better reporting across full customer journey

**How it works**:
- Leads progress through pipeline stages: `new → quote → won → production → invoiced → closed`
- When a quote is accepted, the lead gets a `project_number` and project-specific fields populate
- All project data (photos, materials, crew, invoices) references `lead_id`
- UI adapts based on current stage (early stages show sales info, later stages show project info)

### Database Schema Additions

We'll add these tables:

```sql
-- Extend existing leads table with project fields (see migration below)
-- No separate projects table needed!

-- Quotes
quotes (id, company_id, lead_id, quote_number, title, status, valid_until, total_amount, ...)

-- Quote line items
quote_line_items (id, quote_id, category, description, quantity, unit, rate, amount, ...)

-- Quote templates for common services
quote_templates (id, company_id, name, service_type, default_items, ...)

-- Material orders (references lead_id, not project_id)
material_orders (id, lead_id, supplier, order_date, total_cost, status, ...)
material_order_items (id, order_id, item_name, quantity, unit_cost, ...)

-- Project photos (references lead_id)
project_photos (id, lead_id, photo_url, caption, category, taken_at, uploaded_by, ...)

-- Crew schedules (references lead_id)
crew_schedules (id, lead_id, crew_id, scheduled_date, status, notes, ...)

-- Invoices (references lead_id)
invoices (id, company_id, lead_id, invoice_number, type, amount, status, ...)

-- Payments
payments (id, invoice_id, amount, payment_method, payment_date, reference_number, ...)

-- E-signatures
document_signatures (id, quote_id, signer_name, signer_email, signed_at, ip_address, signature_data, ...)
```

---

## 🚀 Next Up: Week 3 - E-Signature Integration

Now that we have functional quote generation and PDF export, the next logical step is to allow customers to accept quotes digitally.

**What We'll Build:**
1. Public quote view page (no login required)
2. Digital signature capture
3. Quote acceptance workflow
4. Auto-transition to project when accepted
5. Email notifications

**Why This Makes Sense:**
- Completes the quote workflow (create → send → accept)
- Unlocks project management features
- Provides faster customer response times
- Creates clear audit trail for accepted work

Ready to start on e-signatures?

---

## Implementation Plan

### 🗓️ **Week 1-2: Quote Generation System**

**Goal**: Create professional quotes with line items, multiple options, and PDF export

#### Step 1: Quote Database & API

**Database Migration:**
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  quote_number TEXT NOT NULL UNIQUE, -- Auto-generated: Q-2024-001
  title TEXT NOT NULL, -- "Roof Replacement - 123 Main St"
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  version INTEGER DEFAULT 1, -- For revisions
  
  -- Option system (Quote Option A, Option B, etc.)
  option_label TEXT, -- "Option A: Full Replacement", "Option B: Repair Only"
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0.0825, -- 8.25%
  tax_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Terms
  valid_until DATE NOT NULL, -- Quote expires
  payment_terms TEXT, -- "Net 30", "50% deposit required"
  notes TEXT, -- Special terms, exclusions
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Categorization
  category TEXT NOT NULL, -- "Labor", "Materials", "Permits", "Equipment"
  
  -- Line item details
  description TEXT NOT NULL, -- "Asphalt shingles - 30yr architectural"
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL, -- "sqft", "bundle", "hours", "each"
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL, -- quantity * unit_price
  
  -- Optional cost tracking (hidden from customer)
  cost_per_unit DECIMAL(10,2), -- Your actual cost
  supplier TEXT,
  
  sort_order INTEGER NOT NULL,
  notes TEXT, -- Internal notes
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Functions:**
- `getQuotes(companyId, leadId?, status?)` - List quotes
- `getQuote(companyId, quoteId)` - Get single quote with line items
- `createQuote(companyId, quoteData)` - Create new quote
- `updateQuote(companyId, quoteId, updates)` - Update quote
- `duplicateQuote(companyId, quoteId)` - Create new version
- `calculateQuoteTotals(lineItems, taxRate, discount)` - Utility

**React Query Hooks:**
- `useQuotes(leadId?)`
- `useQuote(quoteId)`
- `useCreateQuote()`
- `useUpdateQuote()`

#### Step 2: Quote Builder UI

**Components to Build:**

1. **Quote List** (`/admin/quotes`)
   - Table view of all quotes
   - Filter by status, lead, date range
   - Quick actions (view, edit, duplicate, send, delete)
   - Status badges (draft, sent, accepted, etc.)

2. **Quote Detail** (`/admin/quotes/[id]`)
   - Quote preview (looks like customer sees it)
   - Line items breakdown
   - Totals calculation
   - Actions: Edit, Send, Download PDF, Duplicate, Delete
   - Link to lead
   - Activity timeline (sent, viewed, accepted)

3. **Quote Builder** (`/admin/leads/[id]/quote/new`)
   - **Header Section**:
     - Auto-filled from lead (customer name, address, service type)
     - Quote title, option label
     - Valid until date picker
     - Payment terms textarea
   
   - **Line Items Section**:
     - Add line item button
     - Categories dropdown (Labor, Materials, Permits, Equipment, Other)
     - Drag-to-reorder line items
     - Delete line item
     - Each line: description, quantity, unit, unit price, total (auto-calculated)
     - Subtotal auto-calculates
   
   - **Pricing Section**:
     - Subtotal (sum of line items)
     - Tax rate input (default 8.25%)
     - Tax amount (auto-calculated)
     - Discount input (optional)
     - **Total Amount** (bold, large)
   
   - **Templates Dropdown**:
     - Load saved templates (e.g., "Standard Roof Replacement", "Gutter Install")
     - Populate line items from template
   
   - **Actions**:
     - Save as Draft
     - Save & Preview
     - Save & Send

4. **Quote Templates Manager** (`/admin/settings/quote-templates`)
   - Create reusable templates
   - Define common line items for each service type
   - Save time on future quotes

**Form Validation:**
```typescript
const quoteFormSchema = z.object({
  title: z.string().min(5),
  option_label: z.string().optional(),
  valid_until: z.date(),
  payment_terms: z.string().optional(),
  tax_rate: z.number().min(0).max(1),
  discount_amount: z.number().min(0).default(0),
  line_items: z.array(z.object({
    category: z.enum(['Labor', 'Materials', 'Permits', 'Equipment', 'Other']),
    description: z.string().min(3),
    quantity: z.number().positive(),
    unit: z.string(),
    unit_price: z.number().positive(),
  })).min(1, 'At least one line item required'),
})
```

#### Step 3: Multiple Quote Options

**Implementation:**
- When creating quotes for a lead, allow "Add Another Option"
- Each option is a separate quote record with same `lead_id`
- Options labeled: "Option A", "Option B", "Option C"
- Customer can see all options side-by-side
- Only one can be accepted

**UI:**
- On lead detail page: "Create Quote" → Modal asks "Single quote or multiple options?"
- If multiple: creates quote group, user builds each option
- Quote list shows grouped options
- Customer view shows comparison table

#### Step 4: PDF Generation

**Library**: `react-pdf` or `@react-pdf/renderer`

**PDF Template:**
```
[Company Logo]                    QUOTE #Q-2024-001
Ketterly Roofing                  Date: Nov 29, 2024
123 Business St                   Valid Until: Dec 29, 2024
City, ST 12345
(555) 123-4567

QUOTE FOR:
John Smith
456 Customer Ave
City, ST 12345

PROJECT: Roof Replacement - 456 Customer Ave

OPTION A: Full Asphalt Shingle Replacement

LINE ITEMS:
Category    Description                     Qty    Unit    Price      Total
─────────────────────────────────────────────────────────────────────────
Labor       Remove existing shingles        25     sqft    $2.50      $62.50
Labor       Install new underlayment        25     sqft    $1.00      $25.00
Materials   Asphalt shingles (30yr arch)    3      bundle  $45.00     $135.00
Materials   Underlayment roll               1      roll    $75.00     $75.00
Permits     Building permit                 1      each    $150.00    $150.00

                                                    Subtotal:  $447.50
                                                    Tax (8.25%): $36.92
                                                    ─────────────────────
                                                    TOTAL:     $484.42

PAYMENT TERMS:
50% deposit ($242.21) required to schedule work.
Balance due upon completion.

NOTES:
- Quote valid for 30 days
- Weather delays may extend timeline
- Disposal fees included

ACCEPTANCE:
Customer Signature: _________________    Date: __________

[Footer with company info, license numbers]
```

**PDF Generation API:**
- Endpoint: `/api/quotes/[id]/pdf`
- Generates PDF on-the-fly
- Returns blob for download
- Optionally saves to Supabase Storage

#### Step 5: Email Quote to Customer

**Email Service**: Resend

**Email Template:**
```html
Subject: Your Estimate for [Project Name]

Hi [Customer Name],

Thank you for considering Ketterly Roofing for your project!

Attached is your detailed estimate for: [Project Title]

Quote Number: #Q-2024-001
Total Amount: $484.42
Valid Until: December 29, 2024

[View Online Button] [Download PDF Button] [Accept Quote Button]

If you have any questions, please don't hesitate to reach out.

Best regards,
Ketterly Roofing Team
```

**Implementation:**
- Button: "Send Quote via Email"
- Modal: Confirm recipient email, add custom message
- Sends email with PDF attachment
- Logs activity: "Quote sent to customer"
- Sets `sent_at` timestamp

---

### 🗓️ **Week 3: E-Signature Integration**

**Goal**: Allow customers to digitally sign and accept quotes

#### Option 1: Simple In-App Signature

**Components:**
- Public quote view page: `/quote/[token]` (no login required)
- Customer sees quote details
- "Accept Quote" button → opens signature pad
- Canvas-based signature capture
- Saves signature as base64 image
- Records IP, timestamp, name

**Database:**
```sql
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  signature_data TEXT NOT NULL, -- base64 image
  
  -- Verification
  verification_token TEXT UNIQUE,
  verified_at TIMESTAMPTZ
);
```

**Flow:**
1. Customer receives email with quote link
2. Clicks "View Quote" → public page with quote details
3. Clicks "Accept Quote"
4. Modal: Enter name, email, draw signature
5. Submits → Quote status → 'accepted'
6. Lead status → 'won'
7. **Auto-creates project** (see Week 4)
8. Sends confirmation email to customer & company

#### Option 2: DocuSign/SignNow Integration (Future)

For Phase 2+, integrate with DocuSign API for more formal contracts.

---

### 🗓️ **Week 4-5: Project Management System**

**Goal**: When quote is accepted, auto-create project and manage through completion

#### Step 1: Extend Leads Table for Project Data

**No separate projects table!** We add project fields to the existing `leads` table:

**Database Migration (see migration file below):**
```sql
-- Add project-related columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_number TEXT UNIQUE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scheduled_start_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scheduled_end_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS actual_end_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quoted_amount DECIMAL(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS crew_lead_id UUID REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scope_of_work TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Auto-populate project fields when quote accepted
CREATE OR REPLACE FUNCTION populate_project_fields_from_quote()
RETURNS TRIGGER AS $$
DECLARE
  next_project_num INTEGER;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Generate project number
    SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 'P-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO next_project_num
    FROM leads
    WHERE company_id = NEW.company_id
      AND project_number IS NOT NULL;
    
    -- Update the lead with project data
    UPDATE leads 
    SET 
      status = 'won',  -- Move to won stage
      project_number = 'P-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_project_num::TEXT, 3, '0'),
      quoted_amount = NEW.total_amount,
      scope_of_work = NEW.notes
    WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_quote_accepted
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION populate_project_fields_from_quote();
```

#### Step 2: Project Views (Filtered Lead Views)

**Project List** (`/admin/projects` or `/admin/leads?stage=project`)
- Shows leads where `status IN ('won', 'production', 'invoiced')`
- Table view: Project #, Customer, Status, Start Date, Progress %, Assigned Crew
- Filter by crew, date range, status
- Kanban board view (optional): Won → Production → Invoiced → Closed
- Quick stats: Active projects, this week's schedule, overdue projects
- **Same data as leads, just filtered!**

**Project Detail** (`/admin/leads/[id]` - when status >= 'won')

**Tabbed Interface:**

1. **Overview Tab**:
   - Project info card (name, customer, dates, status)
   - Quoted amount vs actual cost
   - Progress percentage (based on checklist completion)
   - Assigned crew with avatars
   - Quick actions (edit, schedule crew, mark complete)

2. **Checklist Tab**:
   - **Extends lead checklist into project phase**
   - Production stage items from Phase 1:
     - ☐ Deposit collected
     - ☐ Materials ordered
     - ☐ Crew scheduled
     - ☐ Job started
     - ☐ Inspection passed
     - ☐ Job completed
     - ☐ Customer walkthrough done
   - Can add custom tasks per project
   - Each task has: assignee, due date, notes, completion status

3. **Photos Tab** (only visible when status >= 'production'):
   - Before/During/After photo gallery
   - Upload multiple photos
   - Categories: Before, Progress, Completed, Damage, Other
   - Photo details: caption, date taken, uploaded by
   - **Future**: Drawing tools to annotate photos

4. **Materials Tab** (only visible when status >= 'production'):
   - List of material orders
   - Each order: Supplier, Order Date, Delivery Date, Items, Total Cost
   - Track what's ordered vs delivered
   - Compare quoted materials to actual

5. **Crew Schedule Tab**:
   - Assign crew members to project
   - Set work dates
   - Daily logs (what was done each day)
   - Hours tracked per crew member

6. **Invoices Tab**:
   - List of invoices for this project (deposit, progress, final)
   - Payment status
   - Link to invoice detail

7. **Timeline Tab**:
   - All activities (created from quote, deposit paid, work started, etc.)
   - Photo uploads
   - Status changes
   - Notes added

#### Step 3: Photo Upload & Management

**Database:**
```sql
CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  thumbnail_url TEXT, -- Smaller version
  
  category TEXT NOT NULL CHECK (category IN ('before', 'progress', 'completed', 'damage', 'other')),
  caption TEXT,
  
  -- Metadata
  taken_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES users(id),
  file_size INTEGER, -- bytes
  mime_type TEXT,
  
  -- Grouping (for before/after sets)
  photo_set_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Supabase Storage Setup:**
- Bucket: `project-photos`
- Folder structure: `{company_id}/{lead_id}/{photo_id}.jpg`
- Public read access (with signed URLs)
- RLS policies on upload (only company users can upload)

**Photo Upload Component:**
- Drag & drop multiple files
- Category selector
- Caption input (optional)
- Progress bar during upload
- Thumbnail grid after upload
- Lightbox for full-size view

**Mobile Photo Upload:**
- Camera button opens device camera
- Take photo → auto-upload
- GPS coordinates (optional, for job site verification)

**Future Enhancement (Phase 3):**
- Annotation tools (draw arrows, highlight damage)
- Compare before/after slider
- Share photo album with customer

#### Step 4: Material Order Tracking

**Database:**
```sql
CREATE TABLE material_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  
  order_number TEXT, -- Supplier's PO number
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  status TEXT NOT NULL CHECK (status IN ('ordered', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
  
  total_cost DECIMAL(10,2) NOT NULL,
  
  notes TEXT,
  ordered_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE material_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES material_orders(id) ON DELETE CASCADE NOT NULL,
  
  item_name TEXT NOT NULL, -- "Asphalt shingles - 30yr architectural"
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL, -- "bundle", "sqft", "each"
  unit_cost DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  
  sku TEXT, -- Product SKU
  delivered_quantity DECIMAL(10,2), -- Track partial deliveries
  
  notes TEXT
);
```

**Material Tracking UI:**
- "Add Material Order" button on project detail
- Form: Supplier, order date, expected delivery, line items
- Status badges (ordered, in transit, delivered)
- Mark as delivered → updates status, records actual delivery date
- Compare to quote: Did we order what we quoted?
- Cost tracking: Actual material cost vs quoted

#### Step 5: Crew Scheduling

**Database:**
```sql
CREATE TABLE crew_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  crew_member_id UUID REFERENCES users(id) NOT NULL,
  
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  hours_worked DECIMAL(5,2),
  
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  
  notes TEXT, -- Daily log of work done
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Crew Scheduling UI:**

1. **Admin View** (`/admin/leads/[id]/schedule` - when status >= 'production'):
   - Assign crew members to this job
   - Select work dates (single or range)
   - Set hours per day
   - Crew sees this in their dashboard

2. **Crew Dashboard** (`/crew/dashboard`):
   - Calendar view of assigned jobs
   - Today's jobs highlighted
   - Job details (address, scope, contact)
   - Clock in/out functionality
   - Daily notes field
   - Upload progress photos
   - Mark tasks complete

3. **Calendar View** (`/admin/schedule`):
   - Full company schedule
   - See all crew assignments
   - Drag & drop to reassign
   - Filter by crew member, project status

---

### 🗓️ **Week 6: Invoice & Payment System**

**Goal**: Generate invoices, track payments, manage cash flow

#### Step 1: Invoice Database

**Database:**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  
  invoice_number TEXT UNIQUE NOT NULL, -- INV-2024-001
  
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('deposit', 'progress', 'final', 'full')),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL,
  
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled')),
  
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Terms
  payment_terms TEXT, -- "Net 30", "Due upon receipt"
  notes TEXT,
  
  -- Relationship to quote (copy line items)
  quote_id UUID REFERENCES quotes(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(10,2),
  line_total DECIMAL(10,2) NOT NULL,
  
  sort_order INTEGER
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'check', 'credit_card', 'ach', 'wire', 'other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  reference_number TEXT, -- Check number, transaction ID
  notes TEXT,
  
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Step 2: Invoice Generation

**Flow:**
1. From lead detail (when status >= 'production'): "Create Invoice" button
2. Select invoice type:
   - **Deposit**: X% of quoted amount (e.g., 50% = $242.21)
   - **Progress**: Custom amount for work completed
   - **Final**: Remaining balance after deposit/progress payments
   - **Full**: Entire quoted amount (if no deposit taken)

3. Invoice form:
   - Auto-populated from quote and lead data
   - Line items (editable, or copy from quote)
   - Payment terms
   - Due date
   - Notes/instructions

4. Save → generates PDF → can send to customer

**Invoice PDF Template:**
```
[Company Logo]                    INVOICE #INV-2024-001
Ketterly Roofing                  Date: Nov 29, 2024
                                   Due Date: Dec 29, 2024
                                   Project: P-2024-001

BILL TO:
John Smith
456 Customer Ave
City, ST 12345

PROJECT: Roof Replacement - 456 Customer Ave

INVOICE TYPE: Deposit (50%)

LINE ITEMS:
Description                                           Amount
─────────────────────────────────────────────────────────────
Deposit for Roof Replacement (50% of $484.42)        $242.21

                                            Subtotal: $242.21
                                            Tax:      $0.00
                                            ─────────────────
                                            TOTAL:    $242.21
                                            Paid:     $0.00
                                            ─────────────────
                                            BALANCE:  $242.21

PAYMENT TERMS: Due upon receipt

PAYMENT METHODS:
- Check payable to: Ketterly Roofing
- Credit Card: [Payment link]
- ACH/Wire: [Bank details]

Thank you for your business!
```

#### Step 3: Payment Tracking

**Record Payment Flow:**
1. From invoice detail: "Record Payment" button
2. Modal form:
   - Amount (can be partial)
   - Payment method dropdown
   - Payment date
   - Reference number (check #, transaction ID)
   - Notes

3. Submit → Creates payment record
4. Updates invoice:
   - `amount_paid` increases
   - `balance_due` decreases
   - Status: 'paid' (if full), 'partial' (if partial)

5. If final invoice fully paid:
   - Lead status → 'closed'
   - Lead checklist: "Final Payment Collected" → checked
   - Activity: "Final payment received - Project complete"
   - Calculate profit_margin = quoted_amount - actual_cost

**Payment History:**
- List all payments for an invoice
- Show: Date, Amount, Method, Reference, Recorded by
- Running balance

#### Step 4: Financial Dashboard

**Dashboard** (`/admin/financials`)

**Key Metrics:**
- **Outstanding Invoices**: Total owed by customers
- **This Month Revenue**: Total payments received
- **Pending Deposits**: Quotes accepted, deposit not paid
- **Overdue Invoices**: Past due date
- **Project Profitability**: Quoted vs actual costs

**Charts:**
- Revenue over time (line chart)
- Invoices by status (pie chart)
- Top customers by revenue (bar chart)

**Quick Actions:**
- Send invoice reminders (for overdue)
- Generate financial reports (P&L, cash flow)
- Export to CSV/Excel

---

### 🗓️ **Week 7-8: Polish & Integration**

#### Step 1: Workflow Automation

**Auto-actions when events occur:**
1. **Quote Accepted** →
   - Populate project_number on lead (P-2024-001)
   - Update lead status: 'quote' → 'won'
   - Set quoted_amount on lead
   - Generate deposit invoice
   - Send welcome email to customer
   - Trigger production stage checklist items
   - Notify project manager

2. **Deposit Paid** →
   - Update lead checklist: "Deposit Collected" ✓
   - Lead status: 'won' → 'production'
   - Create activity log
   - Enable crew scheduling, photo uploads, material orders

3. **All Materials Delivered** →
   - Update lead checklist: "Materials Ordered" ✓
   - Notify crew lead: "Ready to start work"

4. **Work Completed** →
   - Update lead checklist: "Job Completed" ✓
   - Generate final invoice
   - Lead status: 'production' → 'invoiced'
   - Send completion email to customer
   - Request review/testimonial

5. **Final Payment Received** →
   - Lead status: 'invoiced' → 'closed'
   - Calculate final profit_margin on lead record
   - Archive lead
   - Send thank you email
   - Calculate final profit margin

#### Step 2: Email Notifications

**Email triggers:**
- Quote sent to customer
- Quote accepted → notify sales team
- Invoice sent to customer
- Invoice overdue → reminder email
- Payment received → thank you email
- Project scheduled → crew notification
- Project completed → request review

**Email templates with variables:**
```
Hi {{customer_name}},

Your {{invoice_type}} invoice #{{invoice_number}} for the 
{{project_name}} project is now available.

Amount Due: ${{balance_due}}
Due Date: {{due_date}}

[View Invoice] [Pay Now]

Questions? Reply to this email or call us at {{company_phone}}.

Best regards,
{{company_name}}
```

#### Step 3: Mobile Optimization

**Crew Mobile App Experience:**
- Responsive web app (no native app needed)
- Crew login → mobile dashboard
- Today's jobs list
- Job details (address, map, instructions)
- Clock in/out with GPS verification
- Upload photos from phone camera
- Mark tasks complete
- Add daily notes
- Send invoice to office

**Features:**
- Offline mode (sync when online)
- Push notifications (new job assigned)
- Map integration (navigate to job site)

#### Step 4: Reporting & Analytics

**Reports:**
1. **Sales Report**:
   - Quotes sent vs accepted
   - Conversion rate
   - Average quote value
   - Revenue by service type

2. **Project Report**:
   - Active projects count
   - Average project duration
   - On-time completion %
   - Profit margin by project

3. **Financial Report**:
   - Cash flow (money in vs out)
   - Outstanding AR (accounts receivable)
   - Payment collection time
   - Revenue by month/quarter

4. **Crew Performance**:
   - Jobs completed per crew member
   - Hours worked
   - Customer ratings (future)

**Export Options:**
- CSV for Excel
- PDF for printing
- Email scheduled reports

---

## Phase 2 Completion Checklist

Before moving to Phase 3, verify:

- [ ] Quote generation with line items
- [ ] Multiple quote options per lead
- [ ] PDF generation for quotes
- [ ] Email quotes to customers
- [ ] E-signature integration
- [ ] Auto-create project from accepted quote
- [ ] Project list and detail pages
- [ ] Project checklist (extends lead checklist)
- [ ] Photo upload & gallery
- [ ] Material order tracking
- [ ] Crew scheduling system
- [ ] Crew mobile dashboard
- [ ] Invoice generation (deposit, progress, final)
- [ ] Payment recording
- [ ] Financial dashboard
- [ ] Email notifications
- [ ] Workflow automation
- [ ] All features mobile-responsive
- [ ] Multi-tenant tested
- [ ] Performance optimized

---

## What's Next: Phase 3

**Advanced Features** (~4-6 weeks)

1. **Customer Portal**:
   - Customers log in to see their projects
   - View quotes, invoices, photos
   - Approve change orders
   - Make payments online (Stripe integration)
   - Request service/warranty work

2. **Advanced Scheduling**:
   - Calendar with drag-drop
   - Recurring jobs
   - Weather delay handling
   - Crew capacity planning

3. **Inventory Management**:
   - Track material stock
   - Low stock alerts
   - Supplier management
   - Purchase orders

4. **Enhanced Financials**:
   - Payroll integration
   - Expense tracking
   - Tax reporting
   - Profit/loss by project type

5. **Marketing Automation**:
   - Automated follow-ups
   - Review requests
   - Referral tracking
   - Email campaigns

6. **Integrations**:
   - QuickBooks sync
   - Google Calendar sync
   - Zapier webhooks
   - EagleView/Hover (roof measurements)

---

## Technical Architecture Notes

### State Management
- React Query for all server state
- URL state for filters/pagination
- Local state for forms only

### Real-time Updates
- React Query polling (30s) for project status
- Optimistic updates for quick feedback
- Supabase Realtime for crew updates (optional)

### File Storage
- Supabase Storage for photos, PDFs
- CDN for fast delivery
- Image optimization (thumbnails)

### Security
- RLS on all new tables
- File upload size limits (10MB per photo)
- Rate limiting on email sends
- Audit logs for financial transactions

### Performance
- Lazy load photo galleries
- Virtual scrolling for long lists
- Code splitting by route
- Image lazy loading

---

**Last Updated**: November 29, 2024  
**Status**: Ready to implement  
**Prerequisites**: ✅ Phase 1 Complete
