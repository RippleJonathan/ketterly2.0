# Commission System Improvements - December 12, 2024

## Summary of Changes

Fixed 4 major commission workflow issues to improve accuracy and usability.

---

## 1. ✅ Base Amount Pulls from Financials

**Problem**: Add Commission modal showed "$0" for base amount instead of actual revenue.

**Solution**: 
- Added `useQuery` to fetch lead financials data in `CommissionsTab`
- Base amount now calculated from `estimated_revenue` (quote + change orders)
- Matches the same calculation used in Financials tab and auto-commission

**Files Changed**:
- `components/admin/leads/commissions-tab.tsx` - Added financials query, replaced hardcoded `defaultBaseAmount = 0` with `financialsData?.data?.estimated_revenue || 0`

---

## 2. ✅ Simplified Commission Status Cards

**Problem**: Had 4 status cards (Total Owed, Paid, Pending, Approved) but only 2 are actually used.

**Solution**:
- Removed "Total Owed" and "Approved" cards
- Kept only "Pending" and "Paid" cards (the actual commission workflow)
- Changed grid from 4 columns to 2 columns

**Reasoning**: 
- Commissions are either **Pending** (awaiting payment) or **Paid** (completed)
- "Approved" was redundant - commissions don't need approval, just payment
- "Total Owed" was confusing - "Pending" shows the same information

**Files Changed**:
- `components/admin/leads/commissions-tab.tsx` - Simplified summary cards from 4 to 2

---

## 3. ✅ Financials Use Accepted Quotes Only

**Problem**: Financials tab pulled the latest quote regardless of status, which could include draft or rejected quotes.

**Solution**:
- Updated `getLeadFinancials` to filter by `status IN ('accepted', 'approved')`
- Changed `.single()` to `.maybeSingle()` (returns null if no accepted quote exists)
- Ensures revenue calculations only use quotes that were actually accepted by customer

**Files Changed**:
- `lib/api/financials.ts` - Added status filter to quote query

---

## 4. ✅ Handle Commission Changes After Partial Payment

**Problem**: If commission is partially paid ($2000 of $2000) but then revenue increases to $2500 (new commission $2500), there was no way to track that $500 difference.

**Solution**: Implemented partial payment tracking system

### Database Changes
Added `paid_amount` column to `lead_commissions` table:
```sql
ALTER TABLE lead_commissions
ADD COLUMN paid_amount NUMERIC DEFAULT 0 NOT NULL;
```

### How It Works

1. **Track What's Been Paid**: New `paid_amount` column stores cumulative payments
2. **Calculate Balance**: Balance = `calculated_amount` - `paid_amount`
3. **Partial Payments**: Can pay any amount up to remaining balance
4. **Status Updates**: 
   - Status stays "pending" if partially paid
   - Changes to "paid" when `paid_amount >= calculated_amount`

### Example Workflow

**Initial Commission**:
- Revenue: $20,000
- Rate: 10%
- Calculated Amount: $2,000
- Paid Amount: $0
- Status: Pending

**Partial Payment Made**:
- User records payment of $2,000
- Paid Amount: $2,000
- Status: Paid ✅

**Revenue Increases (Change Order Added)**:
- Revenue: $25,000 (was $20,000)
- Rate: 10%
- Calculated Amount: $2,500 (auto-updated by system)
- Paid Amount: $2,000 (stays the same)
- **Balance Owed**: $500
- Status: Pending ⚠️

**Pay Remaining Balance**:
- User records payment of $500
- Paid Amount: $2,500
- Status: Paid ✅

### UI Improvements

**Mark as Paid Dialog**:
- Shows total commission amount
- Shows amount already paid (if any)
- Shows remaining balance
- Allows partial payment (or full balance)
- Button text changes: "Mark as Paid" vs "Record Payment"

**Migration File**:
- `supabase/migrations/20241212000006_add_commission_paid_amount.sql`
- Adds `paid_amount` column
- Updates existing paid commissions to set `paid_amount = calculated_amount`
- Adds constraint: `paid_amount <= calculated_amount`
- Creates helper function: `get_commission_balance(commission_id)`

---

## Files Modified

### Components
- `components/admin/leads/commissions-tab.tsx`
  - Added financials query for base amount
  - Simplified status cards (4 → 2)

- `components/admin/leads/mark-commission-paid-dialog.tsx`
  - Added payment amount input
  - Shows partial payment status
  - Calculates remaining balance

### API / Hooks
- `lib/api/financials.ts`
  - Filter for accepted quotes only

- `lib/api/lead-commissions.ts`
  - Updated `markCommissionPaid` to handle partial payments
  - Calculates new `paid_amount`
  - Sets status based on whether fully paid

- `lib/hooks/use-lead-commissions.ts`
  - Added `paymentAmount` parameter to mutation

### Types
- `lib/types/commissions.ts`
  - Added `paid_amount: number` to `LeadCommission` interface

### Database
- `supabase/migrations/20241212000006_add_commission_paid_amount.sql`
  - New migration file

---

## Testing Checklist

- [ ] Run migration to add `paid_amount` column
- [ ] Add commission - verify base amount shows revenue from financials
- [ ] View commissions tab - verify only 2 status cards (Pending, Paid)
- [ ] Mark commission as paid - verify can pay partial amount
- [ ] Update lead financials (add change order) - verify commission recalculates
- [ ] Mark partially paid commission - verify shows remaining balance
- [ ] Pay remaining balance - verify status changes to "paid"

---

## Next Steps

To complete this feature:

1. **Run the migration**:
   ```sql
   -- Copy contents of: supabase/migrations/20241212000006_add_commission_paid_amount.sql
   -- Paste into Supabase Dashboard SQL Editor
   -- Run it
   ```

2. **Test the workflow**:
   - Create a lead with a quote
   - Assign user with commission plan
   - Verify commission auto-creates with correct base amount
   - Mark as partially paid
   - Add a change order to increase revenue
   - Verify commission balance updates
   - Pay remaining amount

3. **Optional Enhancements** (Future):
   - Add payment history log (track each partial payment)
   - Add bulk payment feature (pay multiple commissions at once)
   - Add commission adjustment feature (manual override)
   - Add notification when commission balance changes

---

**Status**: ✅ Complete - Ready for Testing  
**Migration Required**: Yes - Run `20241212000006_add_commission_paid_amount.sql`
