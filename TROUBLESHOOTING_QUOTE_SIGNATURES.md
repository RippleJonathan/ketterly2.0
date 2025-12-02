# Quote Signature System - Troubleshooting Guide

## Issue: Constraint Violation on Lead Status

### Problem
When accepting a quote via the public signature link, you get this error:
```
new row for relation "leads" violates check constraint "leads_status_check"
```

### Root Cause
The database trigger `handle_quote_acceptance()` was created with the old lead status value `'won'`, but a later migration changed the allowed status values. The current constraint allows:
- `'new'`, `'quote'`, `'production'`, `'invoiced'`, `'closed'`, `'lost'`, `'archived'`

The trigger tries to set `status = 'won'` which is no longer valid. It should use `status = 'production'` instead.

### Solution

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/project/YOUR_PROJECT_ID
   - Navigate to "SQL Editor" in left sidebar
   - Click "New Query"

2. **Run this SQL:**
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

3. **Restart your development server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

4. **Test the signature flow again**

---

## Issue: PDF Route Returns 404

### Symptoms
The PDF viewer shows "Failed to load resource: 404" when viewing a quote.

### Possible Causes

1. **Quote not found with share token**
   - The query requires BOTH the quote ID AND valid share_token
   - Check that the share_token in the URL matches the database

2. **RLS blocking the query**
   - The route uses service role key which bypasses RLS
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

3. **Deleted quote**
   - The query filters `deleted_at IS NULL`
   - Check if the quote was soft-deleted

### Debug Steps

1. **Check environment variable:**
   ```powershell
   Get-Content .env.local | Select-String "SUPABASE_SERVICE_ROLE_KEY"
   ```

2. **Check terminal output for error details:**
   Look for:
   ```
   PDF quote fetch error: { error: ..., quoteId: ..., shareToken: ... }
   ```

3. **Verify quote exists in database:**
   - Open Supabase Dashboard → Table Editor → quotes
   - Find the quote by ID
   - Verify `share_token` matches
   - Verify `deleted_at` is NULL

4. **Test the query directly in Supabase:**
   ```sql
   SELECT id, quote_number, share_token, status, deleted_at
   FROM quotes
   WHERE id = 'YOUR_QUOTE_ID'
     AND share_token = 'YOUR_TOKEN'
     AND deleted_at IS NULL;
   ```

---

## Files Involved

- **Trigger Function**: Created in `supabase/migrations/20241201000001_add_quote_signatures.sql`
- **Lead Status Constraint**: Modified in `supabase/migrations/20241129000004_add_lead_checklist_system.sql`
- **PDF Route**: `app/api/quotes/[id]/pdf/route.ts`
- **Sign Route**: `app/api/quotes/sign-pdf/route.ts`
- **Public Page**: `app/(public)/quote/[token]/page.tsx`

---

## Quick Reference

### Run Helper Script
```bash
node fix-database.js
```

### Check Service Role Key
```powershell
if ($env:SUPABASE_SERVICE_ROLE_KEY) { 
  Write-Output "Key exists (length: $($env:SUPABASE_SERVICE_ROLE_KEY.Length))" 
} else { 
  Write-Output "ERROR: Key not set!" 
}
```

### Restart Dev Server
```bash
# Stop: Ctrl+C
npm run dev
```

---

## Verification

After applying the fix:

1. ✅ Signature should insert without constraint errors
2. ✅ Quote status updates to 'accepted'
3. ✅ Lead status updates to 'production'
4. ✅ Other quotes for same lead marked as 'declined'
5. ✅ PDF displays with signed signature

---

**Last Updated**: December 1, 2024  
**Issue**: Lead status constraint violation  
**Fix**: Update trigger to use 'production' instead of 'won'
