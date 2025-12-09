# Work Order Email and Tax Fixes

## Issues Fixed

### 1. Material List Showing Work Order Items Instead of Material Order Items
**Problem**: When sending a work order email with "Include material list" checked, the email was showing work order line items instead of material order items.

**Root Cause**: The material list HTML was only generated when `materialOrderIds` was provided (when specific material orders were selected for PDF attachment). The material list should show ALL material orders for the lead, regardless of which PDFs are attached.

**Solution**: 
- Separated material list generation from PDF attachment logic
- Material list now fetches all material orders for the lead (not just selected ones)
- Material list query uses `lead_id` to get all non-deleted material orders
- Material list always shows items WITHOUT prices (safe for subcontractors)

**Code Changes**:
```typescript
// Before: Material list only generated when materialOrderIds provided
if (materialOrderIds && materialOrderIds.length > 0) {
  // ... fetch orders
  if (includeMaterialList) {
    // generate HTML
  }
}

// After: Material list generated separately, fetches all orders for lead
if (includeMaterialList && workOrder.lead_id) {
  const { data: allMaterialOrders } = await supabase
    .from('material_orders')
    .select(`*, items:material_order_items(*, material:materials(name, unit))`)
    .eq('lead_id', workOrder.lead_id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
  
  // Generate HTML table with items, variants, quantities (NO PRICES)
}
```

### 2. Tax on Work Orders Not Optional
**Problem**: Work orders always showed tax on PDFs, even when tax wasn't needed (e.g., for internal work or when subcontractors handle their own taxes).

**Solution**:
1. **Database**: Added `include_tax` boolean field to `work_orders` table (defaults to `true`)
2. **UI**: Added "Include tax in work order" checkbox in edit dialog
3. **Calculation**: Tax only calculated when `include_tax` is `true`
4. **PDF**: Tax line only shown when `include_tax` is `true` AND `tax_amount > 0`
5. **UX**: Tax rate input disabled when checkbox is unchecked

**Files Changed**:
- `supabase/migrations/20241209000003_add_include_tax_to_work_orders.sql` - Database migration
- `lib/types/work-orders.ts` - Added `include_tax: boolean` to WorkOrder and WorkOrderInsert types
- `components/admin/leads/edit-work-order-dialog.tsx`:
  - Added `include_tax: true` to state
  - Modified tax calculation: `const taxAmount = editedDetails.include_tax ? subtotal * editedDetails.tax_rate : 0`
  - Added checkbox UI with helper text
  - Disabled tax rate input when unchecked
  - Conditionally show tax in totals display
  - Save `include_tax` to database
- `components/admin/pdf/work-order-pdf.tsx`:
  - Changed condition from `workOrder.tax_amount > 0` to `workOrder.include_tax && workOrder.tax_amount > 0`

## Database Migration

Run this migration in Supabase Dashboard:

```sql
-- supabase/migrations/20241209000003_add_include_tax_to_work_orders.sql
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS include_tax BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.work_orders.include_tax IS 'Whether to include tax in the work order total and display on PDF (default: true)';
```

## User Workflows

### Sending Work Order with Material List
1. Open work order
2. Click "Send Email"
3. Check "Include material list in email body (without prices)"
4. (Optional) Select specific material order PDFs to attach
5. Send email

**Result**: 
- Email contains work order PDF
- Email body shows ALL materials for the job (from all material orders for the lead)
- Material list shows: Item, Variant, Quantity (NO PRICES)
- If material order PDFs selected, they're also attached (with full pricing for internal records)

### Creating Work Order Without Tax
1. Create/Edit work order
2. Uncheck "Include tax in work order"
3. Tax rate input becomes disabled
4. Tax is set to $0.00
5. Save work order

**Result**:
- Work order total = subtotal (no tax added)
- PDF doesn't show tax line
- Email doesn't mention tax

### Creating Work Order With Tax
1. Create/Edit work order
2. Keep "Include tax in work order" checked (default)
3. Enter tax rate (e.g., 8.25%)
4. Tax calculated automatically
5. Save work order

**Result**:
- Work order total = subtotal + tax
- PDF shows tax line with rate and amount
- Email shows tax in totals

## Benefits

### Material List Fix
✅ Subcontractors see complete material list for the job  
✅ Material costs stay private  
✅ Shows variants (colors, types) so subcontractor knows what to expect  
✅ Works even when no material order PDFs are attached  

### Optional Tax
✅ Flexibility for different tax scenarios  
✅ Cleaner work orders when tax isn't applicable  
✅ Better for internal work orders  
✅ Useful when subcontractors handle their own tax reporting  

## Testing Notes

Tested scenarios:
- ✅ Work order email with material list (no PDFs selected)
- ✅ Work order email with material list + selected material order PDFs
- ✅ Material list shows correct items from material orders (not work order line items)
- ✅ Material list excludes pricing
- ✅ Tax checkbox unchecked → tax = $0, not shown in PDF
- ✅ Tax checkbox checked → tax calculated and shown
- ✅ Tax rate input disabled when checkbox unchecked
- ✅ Existing work orders default to `include_tax = true`

## Migration Instructions

1. **Apply Database Migration**:
   - Open Supabase Dashboard → SQL Editor
   - Run: `supabase/migrations/20241209000003_add_include_tax_to_work_orders.sql`
   - OR use the `run-migration.js` script if available

2. **No Code Changes Needed**: Already deployed via git push

3. **Existing Work Orders**: Will have `include_tax = true` by default (maintains current behavior)

---

**Commit**: `771f5ed`  
**Date**: December 9, 2024  
**Status**: ✅ Complete and Deployed
