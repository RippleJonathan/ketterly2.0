# Multi-Tenant Isolation Testing Guide

**Purpose**: Verify that Row Level Security (RLS) policies properly isolate data between companies.

---

## Pre-Test Setup

### 1. Create Second Test Company

Go to Supabase SQL Editor and run:

```sql
-- Create second test company
INSERT INTO public.companies (name, slug, contact_email, onboarding_completed)
VALUES ('Test Company 2', 'test-company-2', 'test2@example.com', true);

-- Get the company ID (save this!)
SELECT id, name FROM public.companies WHERE slug = 'test-company-2';
```

### 2. Create Test User for Company 2

```sql
-- First, create a user in Supabase Auth Dashboard:
-- Email: testuser2@example.com
-- Password: TestPassword123!

-- Then link them to company 2 (replace the UUIDs):
INSERT INTO public.users (id, company_id, email, full_name, role)
VALUES (
  '[AUTH_USER_ID_FROM_DASHBOARD]',  -- Get from Auth > Users in Supabase
  '[COMPANY_2_ID_FROM_ABOVE]',      -- From step 1
  'testuser2@example.com',
  'Test User 2',
  'admin'
);
```

---

## Test Cases

### Test 1: Lead Isolation

**Steps:**
1. Login as Company 1 user (your main account)
2. Go to `/admin/leads`
3. Note the number of leads you see
4. Create a new lead: "Company 1 Test Lead"
5. Logout

6. Login as Company 2 user (`testuser2@example.com`)
7. Go to `/admin/leads`
8. **EXPECTED**: Should see 0 leads (not Company 1's leads)
9. Create a new lead: "Company 2 Test Lead"
10. Verify you only see "Company 2 Test Lead"

11. Login back as Company 1 user
12. **EXPECTED**: Should only see your leads, not "Company 2 Test Lead"

**✅ PASS**: If you can't see the other company's leads  
**❌ FAIL**: If you can see leads from both companies

---

### Test 2: Lead Detail Access

**Steps:**
1. As Company 1 user, copy a lead ID from the URL (e.g., `/admin/leads/[LEAD_ID]`)
2. Logout and login as Company 2 user
3. Try to navigate directly to `/admin/leads/[COMPANY_1_LEAD_ID]`

**✅ PASS**: Should get 404 Not Found  
**❌ FAIL**: If you can see Company 1's lead details

---

### Test 3: Activity Isolation

**Steps:**
1. As Company 1 user, go to a lead detail page
2. Add an activity note: "Company 1 secret note"
3. Logout and login as Company 2 user
4. Create a lead and add activity: "Company 2 secret note"

**✅ PASS**: Each company only sees their own activities  
**❌ FAIL**: If activities leak between companies

---

### Test 4: Checklist Isolation

**Steps:**
1. As Company 1 user, go to a lead's Checklist tab
2. Check off "Contacted" and "Qualified"
3. Logout and login as Company 2 user
4. Go to any lead's Checklist tab

**✅ PASS**: Company 2's checklists are independent (not pre-checked)  
**❌ FAIL**: If checklist states are shared

---

### Test 5: User Assignment

**Steps:**
1. As Company 1 user, go to leads table
2. Click "Assigned To" dropdown on a lead

**✅ PASS**: Should only see users from Company 1  
**❌ FAIL**: If you see users from Company 2

---

### Test 6: Database-Level Verification

Run in Supabase SQL Editor:

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('leads', 'activities', 'lead_checklist_items', 'users')
ORDER BY tablename;

-- All should show rowsecurity = true
```

**✅ PASS**: All tables show `rowsecurity = true`  
**❌ FAIL**: If any table has `rowsecurity = false`

---

## Cleanup After Testing

```sql
-- Delete test company 2 data
DELETE FROM public.leads WHERE company_id = '[COMPANY_2_ID]';
DELETE FROM public.users WHERE company_id = '[COMPANY_2_ID]';
DELETE FROM public.companies WHERE id = '[COMPANY_2_ID]';

-- Delete test user from Auth (do this in Supabase Dashboard > Auth > Users)
```

---

## Common Issues & Fixes

### Issue: Can see other company's data
**Cause**: RLS policy missing or incorrect  
**Fix**: Check migration file, ensure all policies filter by `company_id`

### Issue: 404 on all pages after switching users
**Cause**: User not linked to company in `users` table  
**Fix**: Re-run step 2 of Pre-Test Setup

### Issue: Can't login as second user
**Cause**: User not created in Auth  
**Fix**: Create user in Supabase Dashboard > Authentication > Users

---

## Success Criteria

All 6 tests must pass before Phase 1 is considered complete:

- [ ] Test 1: Lead Isolation ✅
- [ ] Test 2: Lead Detail Access ✅
- [ ] Test 3: Activity Isolation ✅
- [ ] Test 4: Checklist Isolation ✅
- [ ] Test 5: User Assignment ✅
- [ ] Test 6: Database-Level Verification ✅

**Date Tested**: _______________  
**Tested By**: _______________  
**Result**: ⬜ PASS ⬜ FAIL

---

**Last Updated**: November 29, 2024
