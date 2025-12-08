# Work Orders System - Implementation Guide

## ✅ What's Been Created

A complete **Work Orders** system for managing subcontractor labor - parallel to the Material Orders system but designed for labor/service tracking.

### Core Features

**1. Subcontractors Management**
   - Full CRUD for subcontractor companies
   - Trade specialties tracking (roofing, siding, gutters, etc.)
   - Performance tracking (rating, jobs completed)
   - License & insurance tracking
   - Payment terms configuration

**2. Work Orders**
   - Create detailed work orders for labor/services
   - Line items for labor, materials, equipment, other
   - Automatic cost calculations
   - Job site location tracking
   - Scheduling with estimated duration
   - Status workflow tracking
   - Payment recording

**3. Status Workflow**
   - Draft → Sent → Accepted → Scheduled → In Progress → Completed
   - Smart progression buttons (only show next logical step)
   - Can be cancelled at any stage

**4. Payment Tracking**
   - Record payment date, amount, method
   - Support for partial payments
   - Payment methods: cash, check, credit card, wire transfer, etc.
   - Optional payment notes field

## 📁 Files Created

### 1. Database Migration
**File**: `supabase/migrations/20241206000001_create_work_orders.sql`

**Tables Created**:
- `subcontractors` - Subcontractor companies database
- `work_orders` - Work order header table
- `work_order_line_items` - Individual line items (labor, materials, equipment)

**Features**:
- Complete RLS (Row Level Security) policies
- Foreign key relationships
- Soft deletes support
- Updated_at triggers
- Performance indexes

### 2. TypeScript Types
**File**: `src/lib/types/work-orders.ts`

**Exports**:
- `Subcontractor` interface
- `WorkOrder` interface
- `WorkOrderLineItem` interface
- `WorkOrderStatus` type
- `PaymentMethod` type
- Helper constants: `WORK_ORDER_STATUSES`, `PAYMENT_METHODS`, `TRADE_SPECIALTIES`, etc.

### 3. Subcontractors Management UI
**File**: `src/components/admin/leads/subcontractors-management.tsx`

**Features**:
- Grid view of all subcontractors
- Add/Edit/Delete operations
- Trade specialty badges
- Rating display
- Active/inactive status
- Inline editing with dialog form

**Form Fields**:
- Company name, contact name, email, phone
- Full address
- Trade specialties (multi-select badges)
- License number, insurance expiry
- Payment terms, preferred payment method
- Notes

### 4. Work Order Form
**File**: `src/components/admin/leads/work-order-form.tsx`

**Features**:
- Subcontractor selection dropdown
- Work order title & description
- Scheduling (date + estimated hours)
- Job site address (pre-filled from lead if available)
- Dynamic line items management
- Materials handling toggle
- Tax rate configuration
- Real-time totals calculation
- Special instructions & internal notes

**Line Item Fields**:
- Item type (labor, materials, equipment, other)
- Description
- Quantity + Unit (hour, day, square, etc.)
- Unit price
- Auto-calculated line total

**Cost Breakdown**:
- Separate totals for labor, materials, equipment, other
- Subtotal
- Tax calculation
- Grand total

### 5. Work Order Card
**File**: `src/components/admin/leads/work-order-card.tsx`

**Features**:
- Summary card view with all key info
- Status badge with icon
- Paid badge (green) when payment recorded
- Cost breakdown display
- Smart status progression buttons
- Payment recording dialog
- PDF download (placeholder - needs implementation)
- Email sending (placeholder - needs implementation)
- Delete with soft delete

**Quick Actions**:
- Status progression (contextual buttons)
- Mark as paid
- Download PDF
- Send email
- Delete work order

## 📊 Database Schema

### Subcontractors Table
```sql
- id (UUID)
- company_id (UUID) -- Multi-tenant isolation
- company_name (TEXT) -- Required
- contact_name, email, phone
- address, city, state, zip
- trade_specialties (TEXT[]) -- Array of specialties
- license_number, insurance_expiry
- w9_on_file (BOOLEAN)
- payment_terms (TEXT) -- "Net 30", "COD", etc.
- preferred_payment_method
- rating (DECIMAL 0-5)
- total_jobs_completed (INTEGER)
- notes
- is_active (BOOLEAN)
- created_at, updated_at, deleted_at
```

### Work Orders Table
```sql
- id (UUID)
- company_id (UUID) -- Multi-tenant
- lead_id (UUID) -- Optional link to lead
- subcontractor_id (UUID)
- subcontractor_name, email, phone -- Denormalized
- work_order_number (TEXT)
- title, description
- scheduled_date, estimated_duration_hours
- actual_start_date, actual_completion_date
- job_site_address, city, state, zip
- labor_cost, materials_cost, equipment_cost, other_costs
- subtotal, tax_rate, tax_amount, total_amount
- status (enum: draft, sent, accepted, scheduled, in_progress, completed, cancelled)
- requires_materials (BOOLEAN)
- materials_will_be_provided (BOOLEAN)
- is_paid, payment_date, payment_amount, payment_method, payment_notes
- last_emailed_at, email_count
- internal_notes, special_instructions
- insurance_verified, safety_requirements
- created_by, created_at, updated_at, deleted_at
```

### Work Order Line Items Table
```sql
- id (UUID)
- work_order_id (UUID)
- item_type (enum: labor, materials, equipment, other)
- description (TEXT)
- quantity, unit (hour, day, square, etc.)
- unit_price, line_total
- notes
- sort_order
- created_at, updated_at
```

## 🚀 Next Steps to Complete

### 1. Run Database Migration
```sql
-- Copy SQL from: supabase/migrations/20241206000001_create_work_orders.sql
-- Paste into Supabase Dashboard → SQL Editor
-- Click "Run"
```

### 2. PDF Generation (Not Implemented Yet)
**Needs**:
- Create `src/lib/utils/work-order-pdf-generator.ts`
- Similar to `pdf-generator.ts` but for work orders
- Template showing:
  * Work order number & title
  * Subcontractor details
  * Job site address
  * Scheduled date
  * Line items table
  * Cost breakdown
  * Special instructions
- Both client-side (download) and server-side (email) versions

### 3. Email Functionality (Not Implemented Yet)
**Needs**:
- Create API route: `src/app/api/work-orders/send-email/route.ts`
- Similar to material orders email route
- Email template for work orders
- Attach PDF as work order document
- Track email sends in database

### 4. Integration into Lead Detail Page (Not Implemented Yet)
**Location**: Wherever your lead detail page is (probably `src/app/(admin)/admin/leads/[id]/page.tsx`)

**Add**:
```tsx
import { WorkOrderForm } from '@/components/admin/leads/work-order-form'
import { WorkOrderCard } from '@/components/admin/leads/work-order-card'

// Fetch work orders for this lead
const { data: workOrders } = await supabase
  .from('work_orders')
  .select('*, line_items:work_order_line_items(*)')
  .eq('lead_id', leadId)
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })

// Add to UI
<section>
  <h2>Work Orders</h2>
  <WorkOrderForm 
    companyId={companyId}
    leadId={leadId}
    jobSiteAddress={lead.address}
    defaultTaxRate={company.default_tax_rate}
  />
  
  {workOrders?.map(order => (
    <WorkOrderCard key={order.id} workOrder={order} onUpdate={refetch} />
  ))}
</section>
```

### 5. Subcontractors Settings Page (Optional)
**Location**: `src/app/(admin)/admin/settings/subcontractors/page.tsx`

```tsx
import { SubcontractorsManagement } from '@/components/admin/leads/subcontractors-management'

export default function SubcontractorsPage() {
  const { data: company } = useCurrentCompany()
  
  return (
    <div className="space-y-6">
      <h1>Manage Subcontractors</h1>
      <SubcontractorsManagement companyId={company.id} />
    </div>
  )
}
```

## 🔄 Workflow Example

**Creating a Work Order**:
1. User opens lead detail page
2. Clicks "Add Work Order"
3. Selects subcontractor from dropdown
4. Enters work order title (e.g., "Roof Tear-off Labor")
5. Adds line items:
   - Labor: 8 hours @ $75/hr = $600
   - Equipment rental: 1 day @ $150/day = $150
6. Sets scheduled date
7. Enters job site address (auto-filled from lead)
8. Reviews totals (subtotal: $750, tax: $61.88, total: $811.88)
9. Clicks "Create Work Order"

**Processing Work Order**:
1. Status starts as "Draft"
2. User clicks "Mark as Sent" → Status: Sent
3. Subcontractor accepts → User clicks "Mark Accepted"
4. User schedules date → "Mark Scheduled"
5. Work begins → "Start Work" (In Progress)
6. Work completes → "Mark Completed"
7. Payment received → "Mark as Paid" (opens dialog)
   - Records payment date, amount, method, check #

## 💡 Key Differences from Material Orders

| Feature | Material Orders | Work Orders |
|---------|----------------|-------------|
| **Purpose** | Track materials from suppliers | Track labor from subcontractors |
| **Vendor Type** | Suppliers | Subcontractors |
| **Main Cost** | Material cost by measurement | Labor cost by time |
| **Line Items** | Materials with measurements | Labor, materials, equipment |
| **Delivery** | Delivery vs Pickup toggle | N/A (always on-site) |
| **Status Flow** | Draft → Ordered → Confirmed → In Transit → Delivered | Draft → Sent → Accepted → Scheduled → In Progress → Completed |
| **Performance** | N/A | Rating & jobs completed tracking |
| **Safety** | N/A | Insurance verification, safety requirements |
| **Scheduling** | Delivery date only | Scheduled date + estimated duration |

## 🎯 Benefits

**For Roofing Companies**:
- ✅ Complete labor cost tracking alongside materials
- ✅ Subcontractor performance history
- ✅ Insurance & license compliance tracking
- ✅ Automated work order generation & emailing
- ✅ Payment tracking prevents duplicate payments
- ✅ Job scheduling visibility

**For Subcontractors**:
- ✅ Professional work order documents
- ✅ Clear scope of work
- ✅ Transparent pricing
- ✅ Email notifications
- ✅ Payment terms clarity

## 📝 Testing Checklist

**After Running Migration**:
- [ ] Create first subcontractor
- [ ] Edit subcontractor details
- [ ] Add trade specialties
- [ ] Create work order with multiple line items
- [ ] Test status progression through all stages
- [ ] Record payment for completed work order
- [ ] Verify paid badge appears
- [ ] Test deletion (soft delete)
- [ ] Verify RLS works (create second company, shouldn't see each other's data)

**After PDF Implementation**:
- [ ] Download work order PDF
- [ ] Verify all data appears correctly
- [ ] Check company branding/logo

**After Email Implementation**:
- [ ] Send work order email to subcontractor
- [ ] Verify PDF attached
- [ ] Check email tracking increments
- [ ] Test resending

## 🔗 Integration Points

**Links with Material Orders**:
- Same lead can have both material orders AND work orders
- Combined view shows total project cost (materials + labor)
- Both systems use same payment tracking pattern

**Links with Scheduling** (Future):
- Work order scheduled dates feed into calendar
- Can assign crews to work orders
- Track actual vs estimated duration

**Links with Invoicing** (Future):
- Work order costs feed into customer invoices
- Track margin (customer invoice vs subcontractor cost)
- Batch multiple work orders into single invoice

## 🚦 Current Status

**Completed** ✅:
- Database schema with 3 tables
- TypeScript types & constants
- Subcontractors management UI (full CRUD)
- Work order creation form
- Work order card display
- Status progression workflow
- Payment tracking

**Not Yet Implemented** ⚠️:
- PDF generation for work orders
- Email functionality
- Integration into lead detail page
- Subcontractors settings page (optional)

**Ready for**:
1. Run migration
2. Test subcontractor CRUD
3. Create first work order
4. Implement PDF/Email (copy pattern from material orders)
5. Add to lead detail page
