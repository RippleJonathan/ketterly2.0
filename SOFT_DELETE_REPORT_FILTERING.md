# Soft Delete and Report Filtering Analysis

**Date:** January 7, 2026  
**Status:** Analysis Complete

---

## 🔍 Current State Analysis

### Database Schema Behavior

#### Hard Delete with CASCADE
Most related tables use **`ON DELETE CASCADE`** which means:
- ✅ **If a lead is HARD DELETED**, all related records are automatically deleted
- ✅ No orphaned data in database
- ✅ Clean data integrity

**Tables with CASCADE:**
- `lead_commissions` - ON DELETE CASCADE
- `quotes` - Part of leads table (has own deleted_at)
- `customer_invoices` - ON DELETE CASCADE
- `payments` - ON DELETE CASCADE
- `change_orders` - ON DELETE CASCADE
- `signed_contracts` - ON DELETE CASCADE
- `activities` - Part of leads (has own deleted_at)
- `lead_photos` - ON DELETE CASCADE
- `lead_measurements` - ON DELETE CASCADE
- `production_schedules` - ON DELETE CASCADE
- `materials_orders` - ON DELETE CASCADE
- `lead_checklist_items` - ON DELETE CASCADE
- `company_documents` - ON DELETE CASCADE

#### Soft Delete Implementation

**Every major table has `deleted_at` field:**
- `companies` - deleted_at + index
- `users` - deleted_at + index
- `customers` - deleted_at + index
- **`leads`** - deleted_at + index
- `activities` - deleted_at + index
- **`quotes`** - deleted_at + index
- **`customer_invoices`** - deleted_at (no explicit index shown)
- `projects` - deleted_at + index

---

## 🚨 CRITICAL ISSUES FOUND

### Issue #1: Soft-Deleted Leads Still Show Related Data in Reports

**Problem:** When a lead is soft-deleted (deleted_at set), the related records are NOT soft-deleted:
- ❌ Quotes still have `deleted_at = null`
- ❌ Commissions still have `deleted_at = null`
- ❌ Invoices still have `deleted_at = null`
- ❌ Payments still have `deleted_at = null`

**Current Query Pattern in `quotes.ts`:**
```typescript
// This ONLY filters quotes that are deleted
// It does NOT check if the parent lead is deleted
let query = supabase
  .from('quotes')
  .select(`
    *,
    lead:leads!inner(...)  // ⚠️ !inner means JOIN, but no deleted_at check
  `)
  .eq('company_id', companyId)
  .is('deleted_at', null)  // ⚠️ Only checks quote.deleted_at
```

**Result:** A quote for a soft-deleted lead will still appear in reports because:
1. The quote's `deleted_at` is null (quote wasn't deleted)
2. The query only checks `quotes.deleted_at`
3. The join to `leads` doesn't filter `leads.deleted_at`

### Issue #2: Commission Queries Don't Check Lead Status

**Current Query Pattern in `lead-commissions.ts`:**
```typescript
const { data, error } = await supabase
  .from('lead_commissions')
  .select(`
    *,
    user:users!lead_commissions_user_id_fkey(...)
  `)
  .eq('lead_id', leadId)
  .eq('company_id', companyId)
  .is('deleted_at', null)  // ⚠️ Only checks commission.deleted_at
```

**Result:** Commissions for soft-deleted leads still appear because:
1. Commission's `deleted_at` is null
2. No join to `leads` table to check parent status

### Issue #3: Invoice Queries Don't Check Lead Status

**Current Query Pattern in `invoices.ts`:**
```typescript
let query = supabase
  .from('customer_invoices')
  .select(`
    *,
    lead:leads!customer_invoices_lead_id_fkey(...)  // No deleted_at filter
  `)
  .eq('company_id', companyId)
  .is('deleted_at', null)  // Only checks invoice.deleted_at
```

**Result:** Invoices for soft-deleted leads still appear in reports.

---

## 📊 Impact on Reports

### Reports That Are Affected:

1. **"Quotes Needing Follow-up" Report**
   - ✅ Currently shows: All quotes with status = 'sent' or 'viewed'
   - ❌ **BUG**: Includes quotes for soft-deleted leads
   - 🔧 **Fix Needed**: Add lead deleted_at filter

2. **"Commission Report" (All Unpaid Commissions)**
   - ✅ Currently shows: All commissions with status != 'paid'
   - ❌ **BUG**: Includes commissions for soft-deleted leads
   - 🔧 **Fix Needed**: Join to leads and filter deleted_at

3. **"Outstanding Invoices Report"**
   - ✅ Currently shows: All invoices with status = 'sent' or 'overdue'
   - ❌ **BUG**: Includes invoices for soft-deleted leads
   - 🔧 **Fix Needed**: Add lead deleted_at filter

4. **"Pending Payments Report"**
   - ✅ Currently shows: All payments pending verification
   - ❌ **BUG**: May include payments for soft-deleted leads
   - 🔧 **Fix Needed**: Join through invoice → lead

---

## ✅ Recommended Solutions

### Option 1: Cascade Soft Deletes (RECOMMENDED)

**When a lead is soft-deleted, automatically soft-delete all related records.**

**Pros:**
- ✅ Simple and clean
- ✅ All reports automatically exclude deleted lead data
- ✅ Can restore entire lead with all data if undeleted
- ✅ Maintains referential integrity

**Cons:**
- ❌ Requires database trigger or application logic
- ❌ More database writes on delete

**Implementation:**
```sql
-- Create trigger to cascade soft deletes
CREATE OR REPLACE FUNCTION cascade_lead_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Lead was just soft-deleted, cascade to related tables
    UPDATE quotes SET deleted_at = NEW.deleted_at WHERE lead_id = NEW.id AND deleted_at IS NULL;
    UPDATE lead_commissions SET deleted_at = NEW.deleted_at WHERE lead_id = NEW.id AND deleted_at IS NULL;
    UPDATE customer_invoices SET deleted_at = NEW.deleted_at WHERE lead_id = NEW.id AND deleted_at IS NULL;
    UPDATE activities SET deleted_at = NEW.deleted_at WHERE lead_id = NEW.id AND deleted_at IS NULL;
    -- Add other related tables...
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cascade_lead_soft_delete
  AFTER UPDATE OF deleted_at ON leads
  FOR EACH ROW
  EXECUTE FUNCTION cascade_lead_soft_delete();
```

### Option 2: Join Filtering in Queries

**Modify all queries to join to leads and filter deleted_at.**

**Pros:**
- ✅ No database changes needed
- ✅ Full control in application layer

**Cons:**
- ❌ Must update EVERY query in EVERY API function
- ❌ Easy to forget in new features
- ❌ More complex queries
- ❌ Performance overhead (extra join)

**Example Fix for Quotes:**
```typescript
// Add lead deleted_at filter
let query = supabase
  .from('quotes')
  .select(`
    *,
    lead:leads!inner(
      id,
      full_name,
      email,
      deleted_at  // ⚠️ Must select to filter
    )
  `)
  .eq('company_id', companyId)
  .is('deleted_at', null)  // Quote not deleted
  .is('lead.deleted_at', null)  // Lead not deleted ✅
```

### Option 3: Database Views

**Create database views that automatically filter soft-deleted records.**

**Pros:**
- ✅ Centralized filtering logic
- ✅ Application code stays simple
- ✅ Impossible to forget filtering

**Cons:**
- ❌ RLS policies may be complex
- ❌ Less flexible for edge cases
- ❌ View maintenance overhead

**Example:**
```sql
CREATE VIEW active_quotes AS
SELECT q.*
FROM quotes q
INNER JOIN leads l ON q.lead_id = l.id
WHERE q.deleted_at IS NULL 
  AND l.deleted_at IS NULL;
```

---

## 🎯 Recommended Action Plan

### Phase 1: Immediate Fix (Option 2 - Query Updates)
**Timeline:** 1-2 hours

Update critical report queries to filter soft-deleted leads:

**Files to Update:**
1. ✅ `lib/api/quotes.ts` - `getQuotes()` function
2. ✅ `lib/api/lead-commissions.ts` - All query functions
3. ✅ `lib/api/invoices.ts` - `getInvoices()` function
4. ✅ `lib/api/payments.ts` - Payment query functions

### Phase 2: Long-term Solution (Option 1 - Cascade Trigger)
**Timeline:** 2-3 hours

Create database trigger to cascade soft deletes:

**Migration File:**
```
supabase/migrations/20260107000001_cascade_soft_delete_leads.sql
```

**Benefits:**
- All future reports automatically correct
- No code changes needed for new features
- Can revert query changes from Phase 1

---

## 🧪 Testing Checklist

After implementing fixes:

### Test Scenario 1: Soft Delete Lead
1. Create test lead with:
   - ✅ 1 quote (status = 'sent')
   - ✅ 1 commission (status = 'pending')
   - ✅ 1 invoice (status = 'sent')
   - ✅ 1 payment (status = 'pending')
2. Soft-delete the lead (set deleted_at)
3. Run reports:
   - ❌ Quote should NOT appear in "Quotes Needing Follow-up"
   - ❌ Commission should NOT appear in "Unpaid Commissions"
   - ❌ Invoice should NOT appear in "Outstanding Invoices"
   - ❌ Payment should NOT appear in "Pending Payments"

### Test Scenario 2: Hard Delete Lead
1. Create test lead with related data
2. Hard-delete the lead (DELETE FROM leads)
3. Verify:
   - ✅ All quotes CASCADE deleted
   - ✅ All commissions CASCADE deleted
   - ✅ All invoices CASCADE deleted
   - ✅ All payments CASCADE deleted

### Test Scenario 3: Undelete Lead (Option 1 Only)
1. Soft-delete a lead (cascades to related records)
2. "Undelete" by setting deleted_at = null
3. Verify:
   - ✅ Lead appears in reports
   - ❓ Related records need manual restore or trigger

---

## 📋 Files Requiring Updates (Phase 1)

### High Priority (Reports Affected):
1. **lib/api/quotes.ts**
   - `getQuotes()` - Add lead.deleted_at filter
   
2. **lib/api/lead-commissions.ts**
   - `getUserCommissions()` - Add lead join + filter
   - `getCommissionsByStatus()` - Add lead join + filter
   
3. **lib/api/invoices.ts**
   - `getInvoices()` - Add lead.deleted_at filter
   
4. **lib/api/payments.ts**
   - `getPayments()` - Add invoice→lead join + filter

### Medium Priority (Detail Views):
5. **lib/api/activities.ts**
   - `getLeadActivities()` - Already has lead_id, may need filter
   
6. **lib/api/contracts.ts**
   - `getContracts()` - Add lead join + filter

### Low Priority (Already Scoped to Lead):
- Most other APIs already receive `leadId` parameter and operate within lead context
- These are less likely to show in aggregate reports

---

## 💡 Recommendation Summary

**IMMEDIATE (Today):**
- ✅ Implement Phase 1 query fixes for critical reports
- ✅ Test with soft-deleted lead scenario
- ✅ Deploy and monitor

**LONG-TERM (This Week):**
- ✅ Implement Phase 2 cascade soft delete trigger
- ✅ Revert Phase 1 query changes (cleanup)
- ✅ Add comprehensive soft delete tests

**BEST PRACTICE GOING FORWARD:**
- Always join to parent tables when querying child records for reports
- Add unit tests for soft delete scenarios
- Document soft delete behavior in each API function

---

**End of Analysis**
