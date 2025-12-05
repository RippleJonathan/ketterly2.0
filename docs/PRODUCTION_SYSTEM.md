# Production System - Material Orders & Templates

**Created**: December 5, 2024  
**Status**: Database schema ready for implementation

---

## Overview

This system enables:
1. **Smart Material Orders** - Auto-generate from templates based on measurements
2. **Cost Tracking** - Estimated vs Actual costs for profit margin
3. **Template Library** - Reusable material lists (CertainTeed, GAF, etc.)
4. **Crew Management** - Foreman/laborer hierarchy
5. **Invoice Tracking** - Upload multiple supplier invoices per order

---

## Database Tables

### 1. `suppliers`
**Purpose**: Material suppliers and subcontractors in one table

**Key Fields**:
- `type`: 'material_supplier', 'subcontractor', or 'both'
- Contact info: name, email, phone, address
- `is_active`: Soft delete support

**Example**:
```sql
INSERT INTO suppliers (company_id, name, type, contact_name, email, phone)
VALUES (
  'company-uuid',
  'ABC Roofing Supply',
  'material_supplier',
  'John Smith',
  'john@abcsupply.com',
  '555-123-4567'
);
```

---

### 2. `material_templates` ⭐ **The Smart Part**
**Purpose**: Reusable templates that auto-calculate quantities from measurements

**Key Fields**:
- `name`: Template name (e.g., "CertainTeed ClimateFlex")
- `category`: 'roofing', 'siding', 'windows', etc.
- `items`: **JSON array** of template items with conversion rates

**Items JSON Structure**:
```json
[
  {
    "item": "Shingles",
    "unit": "bundle",
    "per_square": 3,
    "description": "CertainTeed ClimateFlex Architectural"
  },
  {
    "item": "Underlayment",
    "unit": "roll",
    "per_square": 0.1,
    "description": "Synthetic underlayment"
  },
  {
    "item": "Nails",
    "unit": "box",
    "per_square": 0.067,
    "description": "Roofing nails 1.25\""
  }
]
```

**How It Works**:
1. Measurement shows **30 squares**
2. User selects template: **"CertainTeed ClimateFlex"**
3. System auto-calculates:
   - Shingles: 30 × 3 = **90 bundles**
   - Underlayment: 30 × 0.1 = **3 rolls**
   - Nails: 30 × 0.067 = **2.01 boxes** (rounds to 3)

**Admin Can Create/Edit Templates**:
- Settings → Material Templates
- Create new template
- Add/edit/remove items
- Set conversion rates (per_square)
- Mark as active/inactive

---

### 3. `material_orders`
**Purpose**: Track material orders from creation to delivery

**Workflow**:
```
draft → ordered → confirmed → in_transit → delivered
```

**Key Fields**:
- `order_number`: Auto-generated (MO-2024-001)
- `supplier_id`: Which supplier
- `template_id`: Which template was used (if any)
- `status`: Current status
- `expected_delivery_date`: When we expect it
- `actual_delivery_date`: When it actually arrived
- `total_estimated`: Sum of all estimated line items
- `total_actual`: Sum of all actual costs (updated when invoices received)

**Example Flow**:
1. User clicks **"Create Material Order"** on lead
2. System shows: "Use template or create manually?"
3. User selects: **"CertainTeed ClimateFlex"** template
4. System auto-populates line items based on 30 squares
5. User reviews, adjusts quantities if needed
6. Saves as **draft**
7. Sends order to supplier (email PDF) → status: **ordered**
8. Supplier confirms → status: **confirmed**
9. Supplier ships → status: **in_transit**
10. Materials arrive → status: **delivered**, set `actual_delivery_date`
11. Supplier invoice arrives → update `actual_cost` on line items

---

### 4. `material_order_items`
**Purpose**: Line items for each material order

**Key Fields**:
- `description`: "CertainTeed ClimateFlex Shingles"
- `quantity`: 90
- `unit`: "bundle"
- `estimated_unit_cost`: $25.00 (what we budgeted)
- `actual_unit_cost`: $26.50 (what supplier charged)
- `estimated_total`: Auto-calculated (quantity × estimated_unit_cost)
- `actual_total`: Auto-calculated (quantity × actual_unit_cost)

**Profit Margin Calculation**:
```typescript
const profitMargin = ((estimated - actual) / estimated) * 100
// Example: ((2250 - 2385) / 2250) * 100 = -6% (over budget)
```

---

### 5. `order_invoices`
**Purpose**: Upload and track supplier invoices (multiple per order)

**Why Multiple Invoices?**
- Partial deliveries (50 bundles now, 40 bundles later)
- Separate invoices for different items
- Corrections/adjustments

**Key Fields**:
- `order_id`: Which material order
- `invoice_number`: Supplier's invoice #
- `invoice_date`: Date on invoice
- `amount`: Invoice total
- `document_url`: PDF in Supabase Storage
- `is_paid`: Payment status
- `paid_date`: When we paid

**Workflow**:
1. Invoice arrives from supplier
2. User uploads PDF
3. Enters invoice amount
4. System adds to `total_actual` on order
5. User can update `actual_unit_cost` on line items to match invoice

---

### 6. Crew Management

**Users Table Extensions**:
- `crew_role`: 'foreman', 'laborer', or 'none'
- `foreman_id`: If laborer, who's their boss

**`lead_crew_assignments` Table**:
- Many-to-many: Multiple crew members per project
- Tracks who's assigned and their role
- Foreman can add their own laborers

**Hierarchy**:
```
Foreman (John)
├── Laborer (Mike)
├── Laborer (Steve)
└── Sub-Foreman (Carlos)
    ├── Laborer (Jose)
    └── Laborer (Luis)
```

**Permissions** (future):
- Foreman: Can view all their projects, add laborers, upload photos
- Laborer: Can view projects they're assigned to, upload photos
- Admin/Manager: Can view all

---

## UI Implementation Plan

### Phase 1: Material Templates Management

**Location**: `/admin/settings/material-templates`

**Features**:
- List all templates
- Create new template
- Edit template (add/remove items, adjust conversion rates)
- Activate/deactivate templates
- Duplicate template (create variant)

**Template Form**:
```tsx
<form>
  <Input name="name" label="Template Name" placeholder="CertainTeed ClimateFlex" />
  <Select name="category" options={['roofing', 'siding', 'windows']} />
  
  <div className="items-section">
    <h3>Template Items</h3>
    {items.map((item, i) => (
      <div key={i} className="item-row">
        <Input name="item" placeholder="Shingles" />
        <Input name="unit" placeholder="bundle" />
        <Input name="per_square" type="number" step="0.001" placeholder="3.0" />
        <Input name="description" placeholder="CertainTeed ClimateFlex Architectural" />
        <Button onClick={removeItem}>Remove</Button>
      </div>
    ))}
    <Button onClick={addItem}>Add Item</Button>
  </div>
</form>
```

---

### Phase 2: Material Orders UI

**Location**: `/admin/leads/[id]` → **Orders Tab** (renamed from "Work Orders")

**Sub-tabs**:
1. **Material Orders** (this phase)
2. **Work Orders** (future - for subcontractors)

**Material Orders List**:
```
┌─────────────────────────────────────────────────────────────┐
│  [+ Create Material Order]                                   │
├─────────────────────────────────────────────────────────────┤
│  MO-2024-001  │  ABC Supply  │  Delivered  │  $7,800 → $7,900 │
│  Created: 12/1 │ Delivered: 12/14 │ Profit: -$100 (-1.3%)    │
│  [View] [Edit Actual Costs] [Upload Invoice]                │
├─────────────────────────────────────────────────────────────┤
│  MO-2024-002  │  XYZ Materials │  Ordered   │  $1,200 → $--   │
│  Created: 12/5 │ Expected: 12/20 │ Profit: TBD              │
│  [View] [Mark Delivered]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Create Material Order Flow**:

**Step 1: Choose Method**
```
┌─────────────────────────────────────────┐
│  How would you like to create order?    │
├─────────────────────────────────────────┤
│  [📋 Use Template]                      │
│  Auto-calculate from measurements       │
│                                          │
│  [✏️  Manual Entry]                     │
│  Create from scratch                    │
└─────────────────────────────────────────┘
```

**Step 2a: If Template Selected**
```
┌─────────────────────────────────────────┐
│  Select Material Template               │
├─────────────────────────────────────────┤
│  Measurements: 30.5 squares             │
│                                          │
│  ○ CertainTeed ClimateFlex              │
│  ○ GAF Natural Shadow                   │
│  ○ Owens Corning Duration               │
│                                          │
│  [Continue]                              │
└─────────────────────────────────────────┘
```

**Step 3: Review & Adjust**
```
┌─────────────────────────────────────────────────────────────┐
│  Material Order - CertainTeed ClimateFlex                   │
│  Supplier: [ABC Roofing Supply ▼]                          │
│  Expected Delivery: [12/20/2024]                            │
├─────────────────────────────────────────────────────────────┤
│  Item              │ Qty  │ Unit   │ Est. Cost │ Total      │
│  Shingles          │  92  │ bundle │  $25.00   │  $2,300    │
│  Underlayment      │   4  │ roll   │  $85.00   │    $340    │
│  Nails             │   3  │ box    │  $12.00   │     $36    │
│  Ridge Cap         │   7  │ bundle │  $30.00   │    $210    │
│  Starter Strip     │   5  │ bundle │  $22.00   │    $110    │
│  [+ Add Custom Item]                                        │
├─────────────────────────────────────────────────────────────┤
│  Estimated Total: $2,996                                    │
│                                                              │
│  Notes: [Optional notes...]                                 │
│                                                              │
│  [Save as Draft] [Send to Supplier]                         │
└─────────────────────────────────────────────────────────────┘
```

**Step 4: Update Actual Costs (when invoice arrives)**
```
┌─────────────────────────────────────────────────────────────┐
│  Update Actual Costs - MO-2024-001                          │
├─────────────────────────────────────────────────────────────┤
│  Item       │ Qty │ Est. Cost │ Actual Cost │ Variance     │
│  Shingles   │  92 │  $2,300   │  [$2,438  ] │ -$138 (-6%) │
│  Under.     │   4 │    $340   │  [$340    ] │   $0  (0%)  │
│  Nails      │   3 │     $36   │  [$38     ] │  -$2  (-6%) │
│  Ridge Cap  │   7 │    $210   │  [$210    ] │   $0  (0%)  │
│  Starter    │   5 │    $110   │  [$115    ] │  -$5  (-5%) │
├─────────────────────────────────────────────────────────────┤
│  Estimated Total: $2,996                                    │
│  Actual Total:    $3,141                                    │
│  Variance:        -$145 (-4.8%) ⚠️ OVER BUDGET             │
│                                                              │
│  [Upload Invoice PDF]                                       │
│  [Save]                                                      │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 3: Production Checklist

**Extend existing checklist for production stage:**

**lib/constants/pipeline.ts**:
```typescript
production: [
  { key: 'materials_ordered', label: 'Materials Ordered', order: 1, auto: true },
  { key: 'materials_delivered', label: 'Materials Delivered', order: 2, auto: true },
  { key: 'crew_assigned', label: 'Crew Assigned', order: 3, auto: true },
  { key: 'work_started', label: 'Work Started', order: 4 },
  { key: 'work_completed', label: 'Work Completed (includes cleanup)', order: 5 },
  { key: 'final_inspection', label: 'Final Inspection', order: 6, optional: true },
]
```

**Auto-completion**:
- ✅ Materials ordered: When first order status = 'ordered'
- ✅ Materials delivered: When all orders status = 'delivered'
- ✅ Crew assigned: When crew members assigned to lead
- Manual: Work started, completed, inspection

**Progress Bar**:
```
Production Progress: ████████░░ 80% (4/5 complete)
```

---

### Phase 4: Crew Assignment

**Location**: Lead detail → **Team Tab** (or within Overview)

**UI**:
```
┌─────────────────────────────────────────┐
│  Crew Assigned                          │
├─────────────────────────────────────────┤
│  👷 John Smith (Foreman)                │
│     └─ Mike Johnson (Laborer)           │
│     └─ Steve Williams (Laborer)         │
│                                          │
│  [+ Assign Crew]                        │
└─────────────────────────────────────────┘
```

**Assign Crew Modal**:
```
┌─────────────────────────────────────────┐
│  Assign Crew to Project                │
├─────────────────────────────────────────┤
│  Foreman: [John Smith ▼]               │
│                                          │
│  Laborers:                               │
│  ☑ Mike Johnson                         │
│  ☑ Steve Williams                       │
│  ☐ Carlos Martinez (on another job)    │
│                                          │
│  [Assign & Notify]                      │
└─────────────────────────────────────────┘
```

**Notification** (via OneSignal after deployment):
> "You've been assigned to Project P-2024-015 - 123 Main St. Scheduled start: 12/15."

---

## Profit Margin Dashboard

**Location**: Lead detail → **Overview Tab** or **Admin Dashboard**

**Metrics**:
```
┌─────────────────────────────────────────────────────────────┐
│  Project Financials                                         │
├─────────────────────────────────────────────────────────────┤
│  Quoted to Customer:     $12,500                            │
│  Estimated Cost:          $8,500                            │
│  Actual Cost:             $8,745                            │
│                                                              │
│  Estimated Profit:        $4,000  (32%)                     │
│  Actual Profit:           $3,755  (30%) ⚠️ -$245           │
├─────────────────────────────────────────────────────────────┤
│  Cost Breakdown:                                            │
│  Materials: $2,996 → $3,141 (-$145)                        │
│  Labor:     $5,000 → $5,000 ($0)                           │
│  Permits:     $500 → $500 ($0)                             │
│  Equipment:   $500 → $604 (-$104)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## API Functions Needed

### Material Templates
```typescript
// lib/api/material-templates.ts
getTemplates(companyId, category?)
getTemplate(companyId, templateId)
createTemplate(companyId, template)
updateTemplate(companyId, templateId, updates)
deleteTemplate(companyId, templateId)
generateOrderFromTemplate(templateId, squares)
```

### Material Orders
```typescript
// lib/api/material-orders.ts
getMaterialOrders(companyId, leadId?)
getMaterialOrder(companyId, orderId)
createMaterialOrder(companyId, order)
createFromTemplate(companyId, leadId, templateId, squares)
updateMaterialOrder(companyId, orderId, updates)
updateOrderStatus(companyId, orderId, status)
updateActualCosts(companyId, orderId, itemCosts[])
uploadInvoice(companyId, orderId, invoice)
```

### Suppliers
```typescript
// lib/api/suppliers.ts
getSuppliers(companyId, type?)
getSupplier(companyId, supplierId)
createSupplier(companyId, supplier)
updateSupplier(companyId, supplierId, updates)
```

### Crew
```typescript
// lib/api/crew.ts
getCrewMembers(companyId, role?)
assignCrewToLead(companyId, leadId, userIds[])
removeCrewFromLead(companyId, leadId, userId)
getCrewAssignments(companyId, leadId)
```

---

## Next Steps

1. ✅ **Database migration created** - Ready to run
2. ⏳ **Create TypeScript types** from schema
3. ⏳ **Build API functions** for templates, orders, suppliers
4. ⏳ **Build Material Templates UI** in settings
5. ⏳ **Build Material Orders UI** in Orders tab
6. ⏳ **Build Crew Assignment UI**
7. ⏳ **Add Production Checklist**

**Estimated Timeline**: 3-4 weeks for complete implementation

---

**Questions? Ready to start implementation?**
