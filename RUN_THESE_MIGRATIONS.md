# ⚠️ URGENT: Run These Migrations to Enable Invoice Auto-Creation

## Problem Found
The invoice auto-creation triggers are **NOT installed** in your database. This is why invoices aren't being created when quotes are accepted.

## Solution: Run These Migrations in Order

Go to your Supabase Dashboard → SQL Editor and run these files **in this exact order**:

### 1. ✅ Invoice & Commission Auto-Sync (CRITICAL - Run First)
**File**: `supabase/migrations/20241212000007_auto_invoice_and_commission_sync.sql`

This installs:
- `auto_create_invoice_from_quote()` - Creates invoice when quote accepted
- `auto_update_invoice_from_change_order()` - Adds change orders to invoice
- `recalculate_invoice_totals()` - Auto-recalc when line items change
- `auto_update_commission_from_invoice()` - Updates commissions when invoice changes

### 2. ✅ Fix Invoice Trigger for Customer Signature
**File**: `supabase/migrations/20241212000009_invoice_on_customer_signature.sql`

This updates the trigger to fire when customer signs (not just when fully accepted).

### 3. ✅ Fix Invoice Trigger RLS (If you get permission errors)
**File**: `supabase/migrations/20241212000008_fix_invoice_trigger_rls.sql`

This adds `SECURITY DEFINER` to triggers so they work with RLS policies.

---

## How to Run

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy entire contents of `20241212000007_auto_invoice_and_commission_sync.sql`
5. Paste and click **Run**
6. Wait for success message
7. Repeat for migration `20241212000009`
8. Repeat for migration `20241212000008`

---

## Test After Running

Run this command to verify triggers are installed:

```bash
node debug-invoice-creation.js
```

You should now see:
- ✅ Functions found: `auto_create_invoice_from_quote`
- ✅ Triggers attached to quotes table

---

## Quick Test

1. Go to any lead with an accepted quote
2. Go to Estimates tab
3. Change quote status to "draft"
4. Change it back to "accepted"
5. Go to Payments tab
6. You should now see an invoice appear! 🎉

---

## What This Fixes

- ✅ Invoices auto-create when quote accepted/customer signs
- ✅ Change orders auto-add to invoices
- ✅ Invoice line items auto-recalculate totals
- ✅ Commissions auto-update when invoice changes
- ✅ All triggers respect RLS policies

---

## If You Get Errors

If you see "function already exists" or "trigger already exists", that's okay! It means parts are already installed. The migrations use `DROP IF EXISTS` so they're safe to re-run.

If you see permission errors, make sure you're using the service role key or running migrations as a database admin.
