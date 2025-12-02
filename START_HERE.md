# STEP-BY-STEP FIX - Quote Signature System

## What I Just Fixed

✅ **PDF Route Query** - Fixed the Supabase relationship ambiguity error
- Changed from aliased relationships (`lead:leads`) to direct table names (`leads`)
- Properly extract array results for foreign key relationships
- Added comprehensive error logging

## What YOU Need to Do Now

### Step 1: Apply Database Fix (CRITICAL)

The trigger function still has the wrong status value. You MUST run this SQL in Supabase:

1. **Open Supabase SQL Editor:**
   - Go to: https://app.supabase.com/project/ofwbaxfxhoefbyfhgaph
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

2. **Copy and paste this EXACT SQL:**

```sql
CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  quote_record RECORD;
BEGIN
  SELECT * INTO quote_record FROM quotes WHERE id = NEW.quote_id;
  
  UPDATE quotes
  SET status = 'accepted', accepted_at = NEW.signed_at, updated_at = NOW()
  WHERE id = NEW.quote_id;
  
  UPDATE leads
  SET status = 'production', quoted_amount = quote_record.total_amount, updated_at = NOW()
  WHERE id = quote_record.lead_id;
  
  UPDATE quotes
  SET status = 'declined', updated_at = NOW()
  WHERE lead_id = quote_record.lead_id
    AND id != NEW.quote_id
    AND status NOT IN ('accepted', 'declined');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

3. **Click "RUN" (or Ctrl+Enter)**
   - You should see: "Success. No rows returned"

### Step 2: Restart Your Dev Server

```powershell
# In your terminal where dev server is running:
# Press Ctrl+C to stop

# Then restart:
npm run dev
```

### Step 3: Test the Quote

1. **Open the quote link** in your browser
2. **Check PDF loads** - should show the quote without "relationship" error
3. **Click "Sign & Accept Quote"**
4. **Fill in the form and submit**
5. **It should work!** ✨

---

## What Was Wrong?

### Issue 1: Supabase Query Error
**Error:** `"Could not embed because more than one relationship was found for 'quotes' and 'quote_signatures'"`

**Cause:** Using relationship aliases like `signature:quote_signatures(*)` confuses Supabase when there might be multiple relationships.

**Fix:** Use direct table names `quote_signatures(*)` and extract the array on the backend.

### Issue 2: Database Constraint
**Error:** `"new row for relation "leads" violates check constraint "leads_status_check'"`

**Cause:** Trigger tries to set `status='won'` but constraint only allows: `'new'`, `'quote'`, `'production'`, `'invoiced'`, `'closed'`, `'lost'`, `'archived'`

**Fix:** Change trigger to use `status='production'` instead.

---

## Verification Checklist

After completing Steps 1-3 above:

- [ ] PDF displays in iframe without "relationship" error
- [ ] Can see quote details, line items, terms in PDF
- [ ] Download PDF button works
- [ ] Sign & Accept button opens modal
- [ ] Can draw signature and fill name/email
- [ ] Submit signature succeeds (no 500 error)
- [ ] Quote status updates to "Accepted"
- [ ] See green success banner with signature
- [ ] Lead status in database is "production"

---

## If It Still Doesn't Work

**Check the browser console** for new error messages and let me know:
1. What error appears when loading PDF?
2. What error appears when submitting signature?
3. What does the terminal show?

**Check Supabase SQL Editor:**
- Run: `SELECT proname, pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_quote_acceptance'`
- Verify the function shows `status = 'production'` (not 'won')

---

**Created:** December 1, 2024  
**Status:** Code fixed, database update pending
