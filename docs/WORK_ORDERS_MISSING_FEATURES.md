# Work Orders System - Missing Components

## Priority 1: Critical Missing Features

### 1. Edit Work Order Dialog (MISSING)
**File**: `components/admin/leads/edit-work-order-dialog.tsx`

Should mirror `material-order-detail-dialog.tsx` with:
- ✅ Edit work order details (subcontractor, dates, notes)
- ✅ Inline edit line items (quantity, price)
- ✅ Add new line items
- ✅ Delete line items
- ✅ Bulk edit mode
- ✅ Real-time total recalculation
- ✅ Save changes with updateWorkOrder API

### 2. PDF Generation (MISSING)
**File**: `lib/utils/work-order-pdf-generator.ts`

Should create:
- Work order PDF template similar to purchase order
- Include subcontractor info, job details, line items
- Download functionality
- Email attachment capability

### 3. Email Sending (MISSING)
**Files**: 
- `app/api/work-orders/[id]/send-email/route.ts`
- Integration in `work-order-card.tsx`

Should:
- Send work order PDF to subcontractor email
- Track email history (last_emailed_at, email_count)
- Update database after sending
- Use Resend or similar service

### 4. Line Items Fetching (INCOMPLETE)
**File**: `lib/api/work-orders.ts`

Current: Line items not always loaded
Fix: Ensure all queries include line items relation

---

## Priority 2: Workflow Improvements

### 5. Edit Button in Work Order Card
Add Edit button that opens EditWorkOrderDialog

### 6. Work Order Templates (Mentioned but not implemented)
Create work order templates similar to material templates

### 7. Actual vs Estimated Tracking
Material orders track estimated vs actual costs
Work orders should track estimated vs actual labor hours/costs

---

## Comparison Matrix

| Feature | Material Orders | Work Orders | Status |
|---------|----------------|-------------|---------|
| Create | ✅ Yes | ✅ Yes | Complete |
| View Details | ✅ Yes | ✅ Yes (basic) | Partial |
| Edit | ✅ Full editing | ❌ No editing | **MISSING** |
| Delete | ✅ Yes | ✅ Yes | Complete |
| PDF Download | ✅ Yes | ❌ No | **MISSING** |
| Email Sending | ✅ Yes | ❌ No | **MISSING** |
| Status Progression | ✅ Yes | ✅ Yes | Complete |
| Payment Recording | ✅ Yes | ✅ Yes | Complete |
| Line Items Management | ✅ Add/Edit/Delete | ❌ View only | **MISSING** |
| Import from Templates | ✅ Yes | ✅ Yes | Complete |
| Import from Other Orders | ✅ From templates | ✅ From material orders | Complete |
| Email History Tracking | ✅ Yes | ❌ No | **MISSING** |
| Pickup/Delivery Toggle | ✅ Yes | ❌ N/A | N/A |
| Actual vs Estimated | ✅ Yes | ❌ No | **MISSING** |

---

## Action Items

### Immediate (Blocking User)
1. **Create EditWorkOrderDialog** - Most critical, user can't edit work orders
2. **Add Edit button** to work-order-card.tsx
3. **Fix line items loading** in API queries

### High Priority
4. **Implement PDF generation** for work orders
5. **Implement email sending** with PDF attachment
6. **Add email history tracking** to database/UI

### Medium Priority
7. Work order templates system
8. Actual vs estimated hours/cost tracking
9. Crew assignment functionality (if needed)

---

## Files to Create

1. `components/admin/leads/edit-work-order-dialog.tsx` (500+ lines)
2. `lib/utils/work-order-pdf-generator.ts` (300+ lines)
3. `app/api/work-orders/[id]/send-email/route.ts` (100+ lines)
4. Update `work-order-card.tsx` - add Edit button
5. Update `lib/api/work-orders.ts` - ensure line items always loaded
