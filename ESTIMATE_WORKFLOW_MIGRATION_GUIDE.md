# 🔄 MIGRATION GUIDE: Switch to Estimate-Centric Workflow

## Overview

This migration switches from the complex invoice auto-creation system to a simpler estimate-centric approach where:
- **Estimates (quotes)** are the single source of truth
- **Change orders** extend estimates with customer signatures
- **Invoice PDFs** are generated on-demand from estimates
- **Commissions** are based on estimate + change orders total

---

## 📋 Migration Files (Run in Order)

### 1. ✅ Cleanup Invoice System
**File**: `20241213000001_cleanup_invoice_system.sql`

**What it does:**
- Drops all invoice auto-creation triggers
- Drops all invoice auto-creation functions
- Marks invoice tables as deprecated

**Safe to run:** ✅ Yes - Only removes triggers, keeps data

---

### 2. ✅ Add Estimate Locking
**File**: `20241213000002_estimate_locking.sql`

**What it does:**
- Adds `is_locked` column to quotes (prevents editing signed estimates)
- Adds `needs_new_signature` column (flags when changes require re-signing)
- Adds `invoice_generated_at` and `invoice_pdf_url` columns
- Creates trigger to auto-lock estimates when customer signs
- Locks all existing signed estimates

**Safe to run:** ✅ Yes - Only adds columns and helpful automation

---

### 3. ✅ Enhance Change Orders
**File**: `20241213000003_enhance_change_orders.sql`

**What it does:**
- Adds `quote_id` to link change orders to original estimate
- Adds signature fields to change orders (customer_signature_date, company_signature_date, signature_token)
- Adds `pdf_url` for change order PDFs
- Links existing change orders to their quotes
- Creates trigger to mark quote as needing signature when change order is created

**Safe to run:** ✅ Yes - Only adds columns and helpful relationships

---

### 4. ✅ Update Commissions for Estimates
**File**: `20241213000004_commissions_use_estimates.sql`

**What it does:**
- Adds `quote_id` to lead_commissions
- Links existing commissions to their quotes
- Creates triggers to auto-update commissions when:
  - Quote total changes
  - Change orders are approved
- Base amount = Quote Total + Change Orders Total (no more invoices!)

**Safe to run:** ✅ Yes - Improves commission accuracy

---

### 5. ⚠️ Archive Invoice Tables (OPTIONAL)
**File**: `20241213000005_archive_invoice_tables.sql`

**What it does:**
- Creates `archive` schema
- Copies `customer_invoices` and `invoice_line_items` to archive
- Optionally drops the old tables (commented out by default)
- Keeps `payments` table active (still used)

**Safe to run:** ⚠️ Recommended to backup first
- By default: Just creates archive, keeps original tables
- If you uncomment DROP statements: Permanently removes invoice tables

**When to run:**
- Run NOW if you want to archive but keep tables for reference
- Run LATER after confirming new system works
- SKIP if you want to keep invoice tables indefinitely

---

## 🚀 How to Run

### Step 1: Backup Your Database (Recommended)
```sql
-- In Supabase Dashboard → Database → Backups
-- OR use pg_dump if you have access
```

### Step 2: Run Required Migrations (1-4)

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. For each migration file (in order):
   - Click **New Query**
   - Copy entire contents of migration file
   - Paste into editor
   - Click **Run**
   - Wait for success message

**Order:**
1. `20241213000001_cleanup_invoice_system.sql` ✅
2. `20241213000002_estimate_locking.sql` ✅
3. `20241213000003_enhance_change_orders.sql` ✅
4. `20241213000004_commissions_use_estimates.sql` ✅

### Step 3: Optional Archive (Migration 5)

**Option A - Archive but Keep Tables (Recommended)**
- Run `20241213000005_archive_invoice_tables.sql` as-is
- Data is copied to `archive` schema
- Original tables stay in `public` schema (just disabled)

**Option B - Archive and Delete Tables (Clean)**
- Edit `20241213000005_archive_invoice_tables.sql`
- Uncomment the `DROP TABLE` lines near the bottom
- Run the migration
- Old invoice tables are permanently removed (data saved in archive)

**Option C - Skip Entirely**
- Don't run migration 5
- Invoice tables stay active (just unused)

---

## ✅ Verify Migrations Worked

Run this query after all migrations:

```sql
-- Check new columns exist
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
AND column_name IN ('is_locked', 'needs_new_signature', 'invoice_generated_at', 'invoice_pdf_url');

-- Should return 4 rows

-- Check triggers are removed
SELECT tgname 
FROM pg_trigger 
WHERE tgname LIKE '%invoice%';

-- Should return empty or only archive-related triggers

-- Check change orders have new columns
SELECT 
  column_name 
FROM information_schema.columns 
WHERE table_name = 'change_orders' 
AND column_name IN ('quote_id', 'customer_signature_date', 'signature_token');

-- Should return 3 rows

-- Check commissions linked to quotes
SELECT COUNT(*) as linked_commissions
FROM lead_commissions 
WHERE quote_id IS NOT NULL;

-- Should show number of linked commissions
```

---

## 🎯 What Changes in Your App

### Before (Complex):
1. Create quote
2. Customer signs → Quote accepted
3. **Invoice auto-creates** (broken/complex)
4. Edit invoice line items
5. Send invoice PDF

### After (Simple):
1. Create estimate (quote)
2. Customer signs → Estimate locked
3. Need changes? → Create change order → Get signature
4. Job done? → Click "Generate Invoice" → Download/Send PDF
5. Commissions auto-update based on estimate + change orders

---

## 🔧 What You Need to Build in UI

### Immediate:
1. **Estimate Lock** - Show "Locked" badge on signed estimates, prevent editing
2. **"Add Change Order" Button** - When trying to edit locked estimate
3. **"Generate Invoice PDF" Button** - On completed jobs

### Later:
1. Change order e-signature flow (reuse existing quote signature)
2. Invoice PDF template (can reuse quote PDF template)
3. Email invoice functionality

---

## ⚠️ Important Notes

- ✅ **Payments Table** - Still active! Payments are now linked to leads, not invoices
- ✅ **Existing Data** - All historical data preserved (even if archived)
- ✅ **Commissions** - Auto-update based on estimates now (more accurate!)
- ✅ **Change Orders** - Can now be signed like quotes
- ⚠️ **Old Invoices** - If you have any manually created invoices, they're preserved but won't sync

---

## 🆘 Rollback Plan

If something goes wrong:

```sql
-- Rollback Step 1: Re-enable invoice tables
ALTER TABLE IF EXISTS public.customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Rollback Step 2: Remove new columns (if needed)
ALTER TABLE quotes 
DROP COLUMN IF EXISTS is_locked,
DROP COLUMN IF EXISTS needs_new_signature,
DROP COLUMN IF EXISTS invoice_generated_at,
DROP COLUMN IF EXISTS invoice_pdf_url;

-- Rollback Step 3: Restore from backup
-- Use Supabase Dashboard → Database → Backups
```

---

## ✨ Benefits of New System

- ✅ **Simpler** - No complex triggers, no sync issues
- ✅ **More Intuitive** - Matches real roofing workflow
- ✅ **Less Code** - Reuse estimate UI for everything
- ✅ **Fewer Bugs** - One source of truth (estimates)
- ✅ **Better UX** - Users understand "estimate → change order → invoice"
- ✅ **Easier Maintenance** - Less database complexity

---

## 📞 Support

If you encounter errors:
1. **Check error message** - Often tells you exactly what's wrong
2. **Verify order** - Run migrations 1-4 in exact order
3. **Check permissions** - Make sure you're using service role or admin
4. **Review logs** - Supabase Dashboard → Logs shows detailed errors

Common issues:
- "Column already exists" → Already ran this migration, safe to skip
- "Trigger does not exist" → Already cleaned up, safe to continue
- "Permission denied" → Need admin/service role access
