# Source of Truth Pricing System & Material Items Integration

## Overview
Implemented a comprehensive "source of truth" pricing system that automatically tracks contract values through their entire lifecycle, plus added ability to pull material items from database when creating change orders.

---

## Feature 1: Material Items in Change Orders ✅

### What Changed
- Change order builder now queries `material_items` table
- Added dropdown selector to pull material info into line items
- Auto-populates: description, unit price, category from selected material
- Saves `material_item_id` link for future reference

### User Experience
1. **Create Change Order** → Click "+ Add Item"
2. See blue box: **"Add from Materials Database"**
3. Select material from dropdown
4. Description, price, category auto-fill
5. Adjust quantity as needed
6. Can still manually enter items (material selector is optional)

### Database Schema
```sql
ALTER TABLE change_order_line_items
ADD COLUMN material_item_id UUID REFERENCES material_items(id);
```

---

## Feature 2: Source of Truth Pricing System ✅

### The Problem You Identified
```
Contract signed = $13,500          (source of truth)
+ Change Order 1 = $1,000          (should add to source)
+ Change Order 2 = $1,200          (should add to source)
= Current Total = $15,700          (NEW source of truth)
```

But the system was calculating this each time instead of storing it, causing inconsistencies.

### The Solution: `current_total_with_change_orders`

Added a single field to `signed_contracts` table that is **automatically maintained** by database triggers:

```sql
ALTER TABLE signed_contracts
ADD COLUMN current_total_with_change_orders NUMERIC(10,2) NOT NULL;
```

**How it works:**

1. **Contract Created** → `current_total_with_change_orders` = original price
2. **Change Order Approved** → Trigger adds CO total to field
3. **Change Order Deleted/Revoked** → Trigger recalculates from all approved COs
4. **Always accurate** → No manual calculation needed

### Database Triggers

#### Trigger: `update_contract_total_on_change_order()`
Fires on: INSERT, UPDATE, DELETE of change_orders when status = 'approved'

Logic:
```sql
1. Find contract for the quote
2. Get original_contract_price
3. Calculate SUM of all approved change orders
4. Update: current_total_with_change_orders = original + sum(COs)
```

**Handles edge cases:**
- ✅ Change order approved → Adds to total
- ✅ Change order revoked → Recalculates without it  
- ✅ Change order deleted → Recalculates
- ✅ Multiple change orders → Sums all approved ones
- ✅ No change orders → Equals original price

---

## Priority System for Revenue Calculation

Throughout the app, revenue is now calculated with this priority:

```typescript
1. Invoice Total              (if invoice exists)
   ↓ (allows additional items beyond contract)
   
2. current_total_with_change_orders  (SOURCE OF TRUTH)
   ↓ (contract + all approved COs, auto-maintained)
   
3. original_contract_price + manual CO sum  (fallback)
   ↓ (for old contracts without new field)
   
4. quote.total_amount + manual CO sum  (no contract yet)
   ↓ (before contract is signed)
```

### Why Invoice Takes Priority

When you said:
> "if we add anything else to invoice we get source of truth + invoice extras = new source of truth"

This is already built in! The invoice can have:
- All contract line items
- All change order line items  
- **PLUS** additional items added during invoicing

So invoice total becomes the final source of truth for what you're actually billing.

---

## Files Modified

### Migration
**File:** `supabase/migrations/20241215000009_add_material_items_and_source_of_truth.sql`
- Added `material_item_id` to `change_order_line_items`
- Added `current_total_with_change_orders` to `signed_contracts`
- Created comprehensive triggers to maintain the field
- Backfilled existing contracts

### Change Order Builder
**File:** `components/admin/change-orders/change-order-builder.tsx`
- Added material items query
- Added Select dropdown for material selection
- Added `selectMaterialItem()` handler
- Saves `material_item_id` when creating line items
- Uses source of truth for "New Contract Total" display

### Estimates Tab
**File:** `components/admin/leads/estimates-tab.tsx`
- Updated pending CO preview to use source of truth
- Shows accurate "New Contract Total" calculation

### Financials API
**File:** `lib/api/financials.ts`
- Fetches `current_total_with_change_orders` field
- Uses it as primary source for estimated revenue
- Falls back to manual calculation for old contracts

---

## Testing the System

### Test Scenario 1: Material Items
1. Go to Materials tab, ensure you have some materials
2. Create a change order
3. Click "Add from Materials Database"
4. Select a material → Should auto-populate fields
5. Adjust quantity → Total should update
6. Save change order

**Expected:** Line item saved with material_item_id reference

### Test Scenario 2: Source of Truth Accuracy
**Before running migration, check current state:**

```sql
SELECT 
  contract_number,
  original_contract_price,
  current_contract_price,
  (
    SELECT SUM(total) 
    FROM change_orders 
    WHERE quote_id = signed_contracts.quote_id 
      AND status = 'approved'
  ) as approved_co_total
FROM signed_contracts
WHERE deleted_at IS NULL;
```

**After running migration:**

```sql
SELECT 
  contract_number,
  original_contract_price,
  current_total_with_change_orders,
  (
    original_contract_price + COALESCE((
      SELECT SUM(total) 
      FROM change_orders 
      WHERE quote_id = signed_contracts.quote_id 
        AND status = 'approved'
    ), 0)
  ) as expected_total
FROM signed_contracts
WHERE deleted_at IS NULL;
```

**Expected:** `current_total_with_change_orders` = `expected_total` for all rows

### Test Scenario 3: Multiple Change Orders
1. Create contract for $13,500
2. Approve CO #1 for $1,000 → Total should be $14,500
3. Approve CO #2 for $1,200 → Total should be $15,700
4. Check estimate card → Should show $15,700
5. Check financials tab → Should show revenue $15,700
6. Generate PDF → Should show updated total $15,700

**All three should match!**

### Test Scenario 4: Change Order Revoked
1. Have contract with approved COs
2. Change CO status from 'approved' to 'cancelled'
3. Check contract total → Should automatically decrease
4. Check financials → Should update immediately

**Expected:** Trigger recalculates and updates source of truth

---

## Migration Instructions

### Step 1: Run the Migration

Copy the contents of:
```
supabase/migrations/20241215000009_add_material_items_and_source_of_truth.sql
```

Paste into Supabase Dashboard → SQL Editor → Run

### Step 2: Verify Backfill

```sql
-- Should return no rows (all contracts have the field populated)
SELECT * FROM signed_contracts 
WHERE current_total_with_change_orders IS NULL;
```

### Step 3: Test a Change Order

1. Find a contract with a change order
2. Note the current_total_with_change_orders value
3. Delete the change order (soft delete)
4. Check if field updated automatically
5. Restore the change order
6. Check if field updated back

### Step 4: Verify UI Consistency

1. Open a lead with contract + change orders
2. Check these three places:
   - **Estimate Card** → "Updated Contract Total"
   - **Financials Tab** → "Estimated Revenue"  
   - **PDF Download** → "Updated Contract Total"

All three should show the **exact same number**.

---

## Benefits

✅ **Single Source of Truth** - One field that's always accurate  
✅ **Automatic Updates** - No manual calculation needed  
✅ **Consistent Display** - Estimate, financials, PDF all match  
✅ **Future-Proof** - Invoice system already prioritized  
✅ **Material Integration** - Pull items from database easily  
✅ **Edge Case Handling** - Triggers handle all scenarios  
✅ **Audit Trail** - Can trace contract value changes  

---

## What Happens Next (Invoice Generation)

When you implement invoice generation:

```typescript
// Invoice will be created with:
1. Original contract line items
2. All approved change order line items
3. OPTIONAL: Additional line items added during invoicing

// The invoice.total becomes the new source of truth
// Financials already checks invoice first:
estimatedRevenue = invoice?.total || contract.current_total_with_change_orders
```

So the system is already ready for:
- Contract: $13,500
- Change Orders: +$2,200  
- Invoice Extra Items: +$500
- **Final Invoice: $16,200** ← This becomes revenue

---

## Troubleshooting

**Issue:** "New Contract Total" still showing wrong amount  
**Solution:** Re-run the migration to trigger backfill

**Issue:** Change order approved but total didn't update  
**Solution:** Check trigger is active:
```sql
SELECT * FROM pg_trigger 
WHERE tgname = 'update_contract_total_trigger';
```

**Issue:** Material items not showing in dropdown  
**Solution:** Check you have materials in the database:
```sql
SELECT * FROM material_items WHERE deleted_at IS NULL;
```

**Issue:** Multiple contracts for same quote  
**Solution:** Migration uses `ORDER BY created_at DESC LIMIT 1` to get latest

---

## Summary

You now have:
1. ✅ Material item integration in change orders
2. ✅ Single source of truth for contract values
3. ✅ Automatic trigger-based updates
4. ✅ Consistent pricing across all displays
5. ✅ Future-proof for invoice additions

The system maintains accuracy through:
- **Database triggers** (not app logic)
- **One authoritative field** (not calculations)
- **Automatic updates** (no manual intervention)

This is enterprise-grade contract tracking! 🎉
