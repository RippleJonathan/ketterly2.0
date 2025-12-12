# Invoice-Centric Financial Flow - Implementation Guide

## Overview

The system now uses **invoices as the single source of truth** for all financial calculations and commission tracking. This eliminates discrepancies and ensures commissions always reflect the actual billed amount.

---

## New Automated Flow

### 1. Quote Accepted → Invoice Created

**Trigger**: When quote status changes to `'accepted'` or `'approved'`

**What Happens**:
- Auto-creates invoice with unique number (e.g., `INV-00001`)
- Copies all quote line items to invoice line items
- Sets invoice totals from quote (subtotal, tax, total)
- Sets status to `'draft'` (ready to send to customer)
- Sets due date to 30 days from creation

**Database Trigger**: `trigger_auto_create_invoice_from_quote`

**Example**:
```
Quote #Q-1234 accepted → Invoice INV-00001 created
  - Line Item 1: Roof Replacement - $15,000
  - Line Item 2: Gutter Installation - $3,000
  - Subtotal: $18,000
  - Tax (8.25%): $1,485
  - Total: $19,485
```

---

### 2. Change Order Approved → Invoice Updated

**Trigger**: When change order status changes to `'approved'`

**What Happens**:
- Finds the most recent invoice for the lead
- Adds change order as new line item on invoice
- Automatically recalculates invoice totals
- Triggers commission update (see #4)

**Database Trigger**: `trigger_auto_update_invoice_from_change_order`

**Example**:
```
Change Order CO-001 approved for $2,500 → Added to Invoice INV-00001
  - Line Item 3: Skylight Addition (Change Order CO-001) - $2,500
  - NEW Subtotal: $20,500
  - NEW Tax (8.25%): $1,691.25
  - NEW Total: $22,191.25
```

---

### 3. Invoice Line Items → Auto-Recalculate Totals

**Trigger**: When line items are added, updated, or deleted

**What Happens**:
- Sums all line item totals to get new subtotal
- Calculates tax amount based on invoice tax rate
- Updates invoice total
- Triggers commission update

**Database Trigger**: `trigger_recalculate_invoice_totals`

**Can Manually Add Line Items**:
```
Added: Additional cleanup work - $500
  - NEW Subtotal: $21,000
  - NEW Tax: $1,732.50
  - NEW Total: $22,732.50
```

---

### 4. Invoice Total Changes → Commissions Auto-Update

**Trigger**: When invoice `total` field changes

**What Happens**:
- Finds all active commissions for the lead
- Recalculates `calculated_amount` based on new total
- Updates `base_amount` to new invoice total
- If commission was fully paid but now has balance, changes status back to `'pending'`

**Database Trigger**: `trigger_auto_update_commission_from_invoice`

**Example - Partial Payment Scenario**:
```
Initial:
  - Invoice Total: $20,000
  - Commission (10%): $2,000
  - Status: Paid ✅
  - Paid Amount: $2,000

After Change Order:
  - Invoice Total: $22,500 (increased by $2,500)
  - Commission (10%): $2,250 (auto-updated!)
  - Status: Pending ⚠️ (changed automatically)
  - Paid Amount: $2,000 (unchanged)
  - Balance Owed: $250

User can now pay the $250 difference.
```

---

## Financials Tab Changes

### Before (Old System)
- Revenue = Quote Total + Change Orders Total
- Each calculated separately
- Could get out of sync

### After (New System)
- **Revenue = Invoice Total** (single source of truth)
- Invoice already includes quote + change orders
- Always accurate and up-to-date

### Fallback Logic
If no invoice exists yet (quote not accepted):
- Falls back to Quote Total + Change Orders Total
- Once quote accepted and invoice created, switches to invoice total

---

## Commission Calculation Changes

### Before (Old System)
```typescript
// Calculated from quote + change orders
const quoteTotal = await getQuote(leadId)
const changeOrders = await getChangeOrders(leadId)
const baseAmount = quoteTotal + changeOrdersTotal
```

### After (New System)
```typescript
// Calculated from invoice total
const invoice = await getInvoice(leadId)
const baseAmount = invoice.total // Already includes quote + change orders!
```

### Auto-Update Flow
1. Invoice total changes (from quote, change order, or manual line item)
2. Database trigger fires: `auto_update_commission_from_invoice()`
3. Commission `base_amount` and `calculated_amount` updated
4. If partially paid, status changes to `'pending'` to show balance owed

---

## Database Schema

### customer_invoices
```sql
id, company_id, lead_id, quote_id
invoice_number (unique: INV-00001)
invoice_date, due_date
subtotal, tax_rate, tax_amount, total
amount_paid, balance_due (computed)
status (draft, sent, partial, paid, overdue, cancelled, void)
```

### invoice_line_items
```sql
id, company_id, invoice_id
description, quantity, unit_price, total (computed)
quote_line_item_id (reference to source)
change_order_id (reference to source)
sort_order
```

### lead_commissions (updated)
```sql
base_amount -- Now always from invoice total
calculated_amount -- Auto-updated when invoice changes
paid_amount -- Tracks partial payments
```

---

## Migration Files

1. **20241212000006_add_commission_paid_amount.sql**
   - Adds `paid_amount` column to track partial payments
   - Allows handling commission changes after payment

2. **20241212000007_auto_invoice_and_commission_sync.sql** ⭐ NEW
   - Creates 4 database triggers:
     - `auto_create_invoice_from_quote()`
     - `auto_update_invoice_from_change_order()`
     - `recalculate_invoice_totals()`
     - `auto_update_commission_from_invoice()`

---

## API Changes

### lib/api/financials.ts
- Now queries `customer_invoices` first
- Uses `invoice.total` as primary revenue source
- Falls back to quote + change orders if no invoice exists
- Returns invoice and line items in breakdown

### lib/utils/auto-commission.ts
- Changed from querying quotes + change orders
- Now queries invoice total directly
- Simpler, more accurate calculation

---

## Testing Workflow

### Test 1: Quote Accepted → Invoice Created
1. Create a lead with a quote
2. Add line items to quote
3. Change quote status to "accepted"
4. ✅ Verify invoice auto-created with same line items

### Test 2: Change Order → Invoice Updated
1. Approve a change order for existing lead
2. ✅ Verify line item added to invoice
3. ✅ Verify invoice total recalculated

### Test 3: Manual Line Item → Totals Update
1. Open invoice in UI
2. Add/edit/delete line items manually
3. ✅ Verify invoice totals recalculate automatically

### Test 4: Commission Auto-Update
1. Create lead with quote, accept it (invoice created)
2. Assign user with commission plan
3. ✅ Verify commission created with invoice total as base
4. Mark commission as paid
5. Approve a change order (invoice total increases)
6. ✅ Verify commission amount increased
7. ✅ Verify status changed from "paid" to "pending"
8. ✅ Verify balance shows difference

### Test 5: Financials Tab
1. View financials for lead with invoice
2. ✅ Verify "Estimated Revenue" uses invoice total
3. Add change order
4. ✅ Verify financials update automatically (from invoice)

---

## Benefits

### ✅ Single Source of Truth
- Invoice is the authoritative record
- No more discrepancies between quote, change orders, and totals

### ✅ Automatic Updates
- Change orders automatically add to invoice
- Commissions automatically recalculate
- No manual intervention needed

### ✅ Partial Payment Handling
- System tracks what's been paid vs. what's owed
- Handles commission adjustments gracefully
- Clear visibility into balances

### ✅ Simpler Code
- Fewer queries needed (just get invoice total)
- Less complex calculation logic
- Database handles the heavy lifting

### ✅ Audit Trail
- Invoice line items show source (quote vs. change order)
- Can trace each line item back to origin
- Complete financial history

---

## UI Updates Needed (Future)

### Invoices Page
- [ ] View all invoices for company
- [ ] View invoice detail with line items
- [ ] Manually add/edit/delete line items
- [ ] Send invoice to customer
- [ ] Mark invoice as paid

### Quote Detail Page
- [ ] Show "Create Invoice" button when accepted
- [ ] Or show link to existing invoice if already created

### Change Order Detail
- [ ] Show "Added to Invoice" status when approved
- [ ] Link to invoice where it was added

### Financials Tab
- [ ] Highlight that revenue comes from invoice
- [ ] Show invoice breakdown (quote items + change orders + manual items)
- [ ] Link to invoice detail

---

## Notes

- Invoices are NOT automatically sent to customers (status: 'draft')
- Admin must manually send/email invoice when ready
- Multiple change orders can be added to same invoice
- Can manually adjust invoice line items anytime
- Commission updates happen in real-time via triggers
- All calculations happen in database for consistency

---

**Status**: ✅ Database migrations ready  
**Next Step**: Run migration `20241212000007_auto_invoice_and_commission_sync.sql`  
**Testing**: Follow testing workflow above to verify all triggers work

