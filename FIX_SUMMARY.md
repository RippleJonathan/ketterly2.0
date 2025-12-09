# Fix Summary - Work Order Tax & Material List Issues

## Issue 1: Work Order PDFs Still Showing Tax ❌ → ✅

**Problem**: Even after removing tax UI, existing work orders still had tax data in the database, causing PDFs to show tax.

**Root Cause**: The migration and code changes only affected NEW work orders. Existing work orders still had `tax_rate > 0`, `tax_amount > 0`, and `total_amount` included tax.

**Solution**: 
1. ✅ Code already updated - new work orders save with no tax
2. 🔧 **Action Required**: Run this SQL in Supabase Dashboard to fix existing work orders:

```sql
-- Fix all existing work orders
UPDATE public.work_orders
SET 
  tax_rate = 0,
  tax_amount = 0,
  include_tax = false,
  total_amount = subtotal
WHERE tax_amount > 0 OR tax_rate > 0 OR include_tax = true;
```

**Verification Query**:
```sql
SELECT 
  work_order_number,
  subtotal,
  tax_rate,
  tax_amount,
  total_amount,
  include_tax
FROM public.work_orders
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

After running the update, all work orders should show:
- `tax_rate = 0`
- `tax_amount = 0`
- `include_tax = false`
- `total_amount = subtotal`

---

## Issue 2: Material List Showing Work Order Items ❌ → ✅

**Problem**: When sending work order email with "Include material list" checked, it was supposed to show material order items but the logic wasn't working correctly.

**Root Causes**:
1. Duplicate code in the API was causing confusion
2. Material list logic wasn't clear about which material orders to use

**Solution**:

### Updated Logic Flow

**When sending work order email**:

1. **Select Material Orders to Attach** (checkboxes):
   - Shows all material orders for the lead
   - User checks which ones to attach as PDFs
   - Selected orders → full PDF attachments with pricing

2. **Include Material List** (checkbox):
   - Generates HTML table in email body
   - Shows items WITHOUT prices (safe for subcontractors)
   - **If material orders selected**: Uses only selected material orders
   - **If no material orders selected**: Uses all material orders for the lead

### What the Material List Shows

Table with 3 columns:
- **Item**: Material name/description
- **Variant**: Color, type, size, etc.
- **Quantity**: Amount with unit

**NO PRICES** - keeps material costs confidential

### Code Changes

**API (`work-orders/send-email/route.ts`)**:
```typescript
if (includeMaterialList) {
  let ordersForList = []
  
  // Priority 1: Use selected material orders (if any)
  if (materialOrderIds && materialOrderIds.length > 0) {
    ordersForList = fetchByIds(materialOrderIds)
  } 
  // Priority 2: Use all material orders for the lead
  else if (workOrder.lead_id) {
    ordersForList = fetchByLeadId(workOrder.lead_id)
  }
  
  // Generate HTML table from items (no prices)
  const allItems = ordersForList.flatMap(order => order.items)
  materialListHtml = generateTable(allItems)
}
```

**UI Helper Text**:
- When material orders selected: "Material list will show items from 2 selected order(s)"
- When none selected: "Material list will show items from all material orders for this job"

**Removed**:
- Duplicate PDF generation code (was generating each PDF twice)

---

## Files Changed

1. **`app/api/work-orders/send-email/route.ts`**
   - Fixed material list to use selected material orders or all if none selected
   - Removed duplicate PDF generation loop
   - Material list now correctly fetches material order items

2. **`components/admin/leads/send-email-dialog.tsx`**
   - Added helper text to clarify which material orders will be in the list

3. **`supabase/fix_work_order_tax.sql`** (NEW)
   - SQL script to update existing work orders and remove tax

---

## Testing Checklist

### Tax Removal
- [ ] Run `fix_work_order_tax.sql` in Supabase
- [ ] Create new work order - verify no tax fields in UI
- [ ] Generate PDF from new work order - verify no tax line
- [ ] Generate PDF from old work order (after SQL fix) - verify no tax line
- [ ] Check work order totals: `total_amount` should equal `subtotal`

### Material List in Work Order Emails
- [ ] Create work order with associated lead
- [ ] Create 2+ material orders for same lead
- [ ] Send work order email:
  - [ ] Select 1 material order (checkbox)
  - [ ] Check "Include material list"
  - [ ] Verify email shows items from ONLY that 1 material order
  - [ ] Verify NO PRICES shown in material list
  - [ ] Verify material order PDF attached
- [ ] Send work order email:
  - [ ] Select NO material orders
  - [ ] Check "Include material list"
  - [ ] Verify email shows items from ALL material orders for the lead
  - [ ] Verify NO PRICES shown
- [ ] Verify material list shows: Item, Variant, Quantity columns
- [ ] Verify work order PDF is attached

---

## User Workflow Example

### Sending Work Order to Subcontractor

1. Open work order
2. Click "Send Email"
3. Email dialog shows:
   - Primary recipient: Pre-filled with subcontractor email
   - Material orders section with checkboxes (if any exist for this lead)
4. User actions:
   - Select material order(s) to attach as PDFs ✓
   - Check "Include material list in email body" ✓
   - Add CC recipients if needed
5. Click "Send Email"

**Subcontractor receives**:
- Work order PDF (labor, schedule, location)
- Material order PDF(s) - ATTACHED (full details with pricing for internal records)
- Material list - IN EMAIL BODY (items, variants, quantities - NO PRICES)

**Why both?**
- **Material list in email**: Quick reference without opening attachments
- **Material order PDFs**: Full documentation with all details
- **No prices in list**: Subcontractor sees what materials they'll get without seeing company costs

---

## Migration Instructions

### Step 1: Fix Existing Work Orders
```sql
-- Run in Supabase Dashboard → SQL Editor
UPDATE public.work_orders
SET 
  tax_rate = 0,
  tax_amount = 0,
  include_tax = false,
  total_amount = subtotal
WHERE tax_amount > 0 OR tax_rate > 0 OR include_tax = true;
```

### Step 2: Verify
```sql
-- Should show all zeros for tax fields
SELECT COUNT(*) FROM work_orders WHERE tax_amount > 0;
-- Should return 0
```

### Step 3: Test
1. Generate PDF from an old work order → should show no tax
2. Create new work order → no tax fields in UI
3. Send work order email with material list → shows material items

---

**Commit**: `3d4b4e1`  
**Date**: December 9, 2024  
**Status**: ✅ Code deployed, SQL migration required
