# 📊 Estimate-Centric Workflow - Quick Reference

## New Data Flow

```
ESTIMATE (Quote)
    ↓
[Customer Signs] → is_locked = true
    ↓
CHANGE ORDER (if needed)
    ↓
[Customer Signs Change Order] → needs_new_signature = false
    ↓
GENERATE INVOICE PDF (on-demand)
    ↓
PAYMENTS (tracked separately)
```

---

## Database Changes Summary

### Quotes Table (Estimates)
```sql
is_locked                 BOOLEAN   -- Locked when signed
needs_new_signature      BOOLEAN   -- Needs re-signing after changes
invoice_generated_at     TIMESTAMPTZ  -- When invoice PDF created
invoice_pdf_url          TEXT      -- URL to invoice PDF
```

### Change Orders Table
```sql
quote_id                 UUID      -- Links to original estimate
customer_signature_date  TIMESTAMPTZ
company_signature_date   TIMESTAMPTZ
signature_token          TEXT      -- For e-signature link
pdf_url                  TEXT      -- URL to change order PDF
```

### Lead Commissions Table
```sql
quote_id                 UUID      -- Links to estimate
-- base_amount now calculated as: quote.total + sum(change_orders.amount)
```

---

## Financials Calculation

### Estimated Revenue
```typescript
const estimatedRevenue = 
  quote.total_amount + 
  changeOrders.filter(co => co.status === 'approved')
              .reduce((sum, co) => sum + co.amount, 0)
```

### Commission Base
```typescript
const commissionBase = estimatedRevenue  // Same as estimated revenue
```

---

## UI Changes Needed

### Estimates Tab
- [x] Show "Locked 🔒" badge when `is_locked = true`
- [ ] Disable "Edit" button when locked
- [ ] Show "Add Change Order" button when locked
- [ ] Show "⚠️ Needs Signature" badge when `needs_new_signature = true`
- [ ] Add "Generate Invoice" button (when job complete)

### Change Orders
- [ ] Link to original quote (`quote_id`)
- [ ] E-signature flow (reuse quote signature component)
- [ ] Generate change order PDF (similar to quote PDF)
- [ ] Auto-mark `needs_new_signature = false` after signing

### Financials Tab
- [x] Use `quote.total + change_orders.total` for estimated revenue
- [ ] Remove invoice-based calculations
- [ ] Show estimate status (draft/signed/needs-signature)

### Invoice/Payments Tab
- [ ] "Generate Invoice PDF" button
- [ ] Download invoice PDF
- [ ] Email invoice to customer
- [ ] Track payments (already works - linked to leads)

---

## Trigger Behavior

### Auto-Lock Estimate
```sql
WHEN customer signs quote
→ SET is_locked = true
```

### Auto-Mark Needs Signature
```sql
WHEN change order created/approved
→ SET quote.needs_new_signature = true
```

### Auto-Update Commissions
```sql
WHEN quote.total_amount changes
  OR change_order approved
→ RECALCULATE commission.base_amount
→ RECALCULATE commission.calculated_amount
```

---

## Business Rules

### Editing Estimates
- ✅ Can edit draft estimates freely
- ❌ Cannot edit locked estimates directly
- ✅ Must create change order to modify locked estimate

### Change Orders
- Must link to a quote (`quote_id` required)
- Requires customer signature (like quotes)
- Optional company signature
- Approved change orders add to estimated revenue

### Invoice Generation
- Invoice is a PDF snapshot of estimate + change orders
- Generated on-demand (not auto-created)
- Stored in Supabase Storage
- URL saved in `quote.invoice_pdf_url`

### Payments
- Linked to `lead_id` (not invoice_id)
- Can have multiple payments per lead
- Payments reduce outstanding balance

---

## Migration Checklist

- [ ] 1. Run `20241213000001_cleanup_invoice_system.sql`
- [ ] 2. Run `20241213000002_estimate_locking.sql`
- [ ] 3. Run `20241213000003_enhance_change_orders.sql`
- [ ] 4. Run `20241213000004_commissions_use_estimates.sql`
- [ ] 5. (Optional) Run `20241213000005_archive_invoice_tables.sql`
- [ ] 6. Verify with test queries
- [ ] 7. Update UI to show lock status
- [ ] 8. Add "Generate Invoice" button
- [ ] 9. Build change order signature flow
- [ ] 10. Test complete workflow

---

## Next Steps for Development

### Priority 1 (MVP)
1. Add lock badge to estimates UI
2. Add "Generate Invoice PDF" button
3. Create invoice PDF template (reuse quote template)
4. Update financials calculation

### Priority 2 (Full Feature)
1. Change order signature flow
2. Change order PDF generation
3. Email invoice functionality
4. Better change order UI

### Priority 3 (Polish)
1. Change order approval workflow
2. Invoice history/versioning
3. Batch invoice generation
4. Payment portal integration
