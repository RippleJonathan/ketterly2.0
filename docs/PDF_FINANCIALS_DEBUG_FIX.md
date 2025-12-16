# PDF and Financials Debugging - Issue Analysis and Fix

## Problem Statement
PDF generation showing $15,500 instead of $14,500 (double-adding $1,000 change order)
Financials showing $13,500 instead of $14,500 (missing $1,000 change order)

## Root Cause Analysis

### Issue #1: Missing Database Fields in SELECT Queries
**Location:** `lib/hooks/use-generate-quote-pdf.ts` and `lib/api/financials.ts`

The client-side PDF generation and financials API were querying:
```typescript
.select('original_contract_price, current_contract_price')
```

But then trying to use a fallback:
```typescript
contract?.original_contract_price || contract?.original_total
```

**Problem:** `original_total` was never selected, so the fallback was always `undefined`!

This meant when `original_contract_price` was NULL (for older contracts), the code fell back to `quote.subtotal` and `quote.total_amount`, which may have been modified by database triggers to include change orders.

**Fix:** Added `original_total` and `original_subtotal` to SELECT queries:
```typescript
.select('original_contract_price, current_contract_price, original_total, original_subtotal')
```

### Issue #2: Incorrect Field Usage in PDF Template
**Location:** `components/admin/quotes/quote-pdf-template.tsx`

The PDF template was using `originalContractPrice` for BOTH:
- Subtotal line (should be pre-tax amount)
- Original Contract Total line (should be after-tax amount)

```tsx
// WRONG - using same value for both
<Text>Subtotal: {formatCurrency(originalContractPrice || quote.subtotal)}</Text>
<Text>Total: {formatCurrency(originalContractPrice || quote.total_amount)}</Text>
```

**Problem:** When a contract exists, both lines showed $13,500, which is actually the TOTAL (after tax), not the subtotal (before tax).

Then when calculating the updated total:
```tsx
Updated Total: {formatCurrency(
  (originalContractPrice || quote.total_amount) + changeOrders.reduce(...)
)}
```

It would calculate: $13,500 (total) + $1,000 (CO) = $14,500

But if the display logic was comparing against modified quote values, it could show $15,500.

**Fix:** 
1. Added `originalSubtotal` prop to template
2. Use `originalSubtotal` for Subtotal line
3. Use `originalContractPrice || original_total` for Original Contract Total line

## Database Schema Context

The `signed_contracts` table has BOTH old and new fields:

**Old fields (from original migration):**
- `original_subtotal` - Pre-tax amount
- `original_tax` - Tax amount
- `original_total` - After-tax total

**New fields (added later for change orders):**
- `original_contract_price` - Copy of `original_total` (initial contract)
- `current_contract_price` - Running total with approved change orders

The migration that added the new fields backfilled them:
```sql
UPDATE public.signed_contracts
SET original_contract_price = original_total
WHERE original_contract_price IS NULL;
```

However, older contracts might not have gone through this backfill properly.

## Changes Made

### 1. `lib/hooks/use-generate-quote-pdf.ts`
- ✅ Added `original_total` to SELECT query
- ✅ Added `original_subtotal` to SELECT query  
- ✅ Pass `originalSubtotal` to PDF template (both download and upload functions)

### 2. `lib/api/financials.ts`
- ✅ Added `original_total` to SELECT query

### 3. `app/api/quotes/[id]/generate-pdf/route.ts`
- ✅ Pass `originalSubtotal` to PDF template (server-side already had `original_total` via `select('*')`)

### 4. `components/admin/quotes/quote-pdf-template.tsx`
- ✅ Added `originalSubtotal?: number` to interface
- ✅ Added `originalSubtotal` to destructured props
- ✅ Changed Subtotal line to use: `originalSubtotal || quote.subtotal`
- ✅ Kept Original Contract Total using: `originalContractPrice || quote.total_amount`

## Expected Behavior After Fix

### PDF Totals Section (with $13,500 original quote + $1,000 change order):
```
Subtotal:               $12,321.00  (pre-tax, from original_subtotal)
Tax (8.25%):            $1,179.00   (from quote.tax_amount)
Original Contract Total: $13,500.00  (from original_contract_price or original_total)
Approved Change Orders:  +$1,000.00  (sum of approved COs)
Updated Contract Total:  $14,500.00  (calculated: $13,500 + $1,000)
```

### Financials Display:
```
Estimated Revenue: $14,500.00  (contract current_contract_price or calculated)
Quote Amount: $13,500.00
Change Orders: +$1,000.00
```

## Verification Steps

1. **Check Database Values** (run debug-contract-values.sql):
   - Verify `original_contract_price` is set correctly
   - Verify `current_contract_price` = original + approved change orders
   - Check if `quote.total_amount` has been modified

2. **Test PDF Generation**:
   - Download PDF for a contract with change orders
   - Verify Subtotal shows pre-tax amount
   - Verify Original Contract Total shows correct total
   - Verify Updated Contract Total = Original + Change Orders

3. **Test Financials**:
   - Check Estimated Revenue shows Updated Contract Total
   - Verify breakdown shows Quote + Change Orders correctly

## Potential Remaining Issues

If values are still incorrect after this fix, check:

1. **Database Trigger Modifications**: 
   - There may be a trigger modifying `quote.total_amount` or `quote.subtotal`
   - Run the debug SQL to see actual database values

2. **Missing Backfill**:
   - Some contracts might have NULL `original_contract_price`
   - Run migration 20241215000002 again to backfill

3. **Change Order Trigger**:
   - Verify `update_contract_price_on_change_order()` function is working
   - Check if `current_contract_price` is being updated when COs are approved

## Debug Query

Created: `debug-contract-values.sql`

Run this in Supabase SQL Editor to see:
- All contract price fields side-by-side
- Expected vs actual values
- Change orders totals
- Calculated current total vs stored current_contract_price
