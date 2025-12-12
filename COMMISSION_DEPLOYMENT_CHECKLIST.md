# Commission System Deployment Checklist

Use this checklist when deploying the commission tracking system.

## Pre-Deployment

- [ ] Review all documentation files
- [ ] Backup production database
- [ ] Test migration in development/staging first
- [ ] Verify Supabase project is accessible
- [ ] Confirm you have admin access to Supabase Dashboard

## Database Migration

- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Open file: `supabase/migrations/20241212000002_lead_commissions.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Wait for "Success. No rows returned" message
- [ ] Verify no errors in output

## Verification Queries

Run these in SQL Editor to verify:

```sql
-- 1. Verify table exists
SELECT COUNT(*) FROM lead_commissions;
-- Expected: 0 rows (empty table)

-- 2. Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lead_commissions';
-- Expected: ~20 columns listed

-- 3. Verify permissions added
SELECT can_view_commissions, can_manage_commissions, can_mark_commissions_paid
FROM user_permissions LIMIT 1;
-- Expected: 3 boolean columns

-- 4. Check admin permissions (should be true)
SELECT u.full_name, u.role,
       p.can_view_commissions,
       p.can_manage_commissions,
       p.can_mark_commissions_paid
FROM users u
JOIN user_permissions p ON p.user_id = u.id
WHERE u.role = 'admin' LIMIT 5;
-- Expected: All 3 should be TRUE for admins

-- 5. Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'lead_commissions';
-- Expected: At least 1 policy listed
```

Checks:
- [ ] Table `lead_commissions` exists
- [ ] All columns present
- [ ] Permission columns added to `user_permissions`
- [ ] Admin users have all 3 permissions = true
- [ ] RLS policies active

## UI Testing - Admin User

- [ ] Log in as admin
- [ ] Navigate to Leads list
- [ ] Click any lead to open detail page
- [ ] Scroll to tabs section
- [ ] Find "Commissions" tab (should be between Financials and Team)
- [ ] Click "Commissions" tab
- [ ] Verify you see:
  - [ ] Summary cards (Total Owed, Paid, Pending, Approved - all $0.00)
  - [ ] "Add Commission" button (top right)
  - [ ] Empty state message

## Create Test Commission

- [ ] Click "Add Commission" button
- [ ] Dialog opens with form
- [ ] Select a user from dropdown
- [ ] Select commission type: "Percentage"
- [ ] Enter rate: 10
- [ ] Enter base amount: 10000
- [ ] Verify calculated amount shows: $1,000.00
- [ ] Select "When Final Payment Received"
- [ ] Add note: "Test commission"
- [ ] Click "Create Commission"
- [ ] Success toast appears
- [ ] Dialog closes
- [ ] Commission appears in table
- [ ] Summary cards update (Total Owed: $1,000.00)

## Edit Test Commission

- [ ] Click pencil icon on the commission
- [ ] Change rate to 15
- [ ] Verify calculated amount updates to: $1,500.00
- [ ] Click "Update Commission"
- [ ] Success toast appears
- [ ] Table shows updated amount
- [ ] Summary shows $1,500.00

## Mark Commission as Paid

- [ ] Click checkmark icon on the commission
- [ ] Mark as Paid dialog opens
- [ ] Shows commission details correctly
- [ ] Add payment notes: "Test payment - Check #TEST123"
- [ ] Click "Confirm Payment"
- [ ] Success toast appears
- [ ] Status badge turns green "Paid"
- [ ] Summary moves $1,500 from Pending to Paid
- [ ] Edit/Delete buttons no longer visible (can't edit paid commissions)

## Test Multiple Commissions

- [ ] Create 2nd commission: Flat Amount $500
- [ ] Summary shows: Total Owed $2,000, Paid $1,500, Pending $500
- [ ] Create 3rd commission: Percentage 5% of $10,000 = $500
- [ ] Summary shows: Total Owed $2,500, Paid $1,500, Pending $1,000
- [ ] Table shows all 3 commissions
- [ ] Each row has correct data

## Delete Test Commission

- [ ] Click trash icon on unpaid commission
- [ ] Confirmation dialog appears
- [ ] Click "Delete"
- [ ] Commission removed from table
- [ ] Summary updates (removes from Pending)
- [ ] Cannot delete paid commissions ✅

## UI Testing - Sales User

- [ ] Log in as sales role user
- [ ] Navigate to a lead detail
- [ ] Click "Commissions" tab
- [ ] Verify you see:
  - [ ] Summary cards (read-only)
  - [ ] Commission table
  - [ ] NO "Add Commission" button ✅
  - [ ] NO edit/delete/mark paid buttons ✅
- [ ] Can view data but not modify ✅

## UI Testing - Production User

- [ ] Log in as production role user
- [ ] Navigate to a lead detail
- [ ] Verify "Commissions" tab is NOT visible ✅
- [ ] User does not have can_view_commissions permission ✅

## Permission Matrix Verification

Test each role:

| Role | Can See Tab | Can Add | Can Edit | Can Mark Paid |
|------|------------|---------|----------|---------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Office | ✅ | ✅ | ✅ | ✅ |
| Sales Manager | ✅ | ✅ | ✅ | ❌ |
| Sales | ✅ | ❌ | ❌ | ❌ |
| Production | ❌ | ❌ | ❌ | ❌ |
| Marketing | ❌ | ❌ | ❌ | ❌ |

## Multi-Tenant Testing

If you have multiple companies:

- [ ] Create commission as Company A admin
- [ ] Log in as Company B admin
- [ ] Navigate to Company A's lead (should 404 or access denied)
- [ ] Check API: Should return empty array for Company B
- [ ] Verify RLS prevents cross-company access ✅

## Responsive Design Testing

- [ ] Test on desktop (1920x1080)
  - [ ] Summary cards in 4-column grid
  - [ ] Table fits horizontally
- [ ] Test on tablet (768px)
  - [ ] Summary cards in 2-column grid
  - [ ] Table scrolls horizontally
- [ ] Test on mobile (375px)
  - [ ] Summary cards in 1-column stack
  - [ ] Table scrolls horizontally
  - [ ] Dialogs responsive

## Error Handling

- [ ] Try to create commission with rate > 100
  - [ ] Validation error shows
- [ ] Try to create with negative amount
  - [ ] Validation error shows
- [ ] Try to create without selecting user
  - [ ] Form validation prevents submit
- [ ] Try to edit paid commission
  - [ ] Edit button not visible ✅
- [ ] Try to delete paid commission
  - [ ] Delete button not visible ✅

## Performance Testing

- [ ] Create 10 commissions on one lead
- [ ] Page loads quickly (<2 seconds)
- [ ] Table renders all 10 rows
- [ ] Summary calculates correctly
- [ ] No console errors

## Integration Testing

- [ ] Commission appears on correct lead
- [ ] User names display correctly
- [ ] Commission plan integration works (if plans exist)
- [ ] Created by / Paid by user names show
- [ ] Dates format correctly
- [ ] Currency formats correctly ($1,000.00)

## Documentation Review

- [ ] Read `COMMISSION_TRACKING_IMPLEMENTATION.md`
- [ ] Read `COMMISSION_TRACKING_QUICK_START.md`
- [ ] Read `COMMISSION_SYSTEM_SUMMARY.md`
- [ ] All documentation accurate and helpful

## User Training

- [ ] Schedule training session for admins
- [ ] Schedule training for office staff
- [ ] Create internal documentation/SOP
- [ ] Record training video (optional)
- [ ] Share quick start guide with users

## Post-Deployment

- [ ] Monitor Supabase logs for errors
- [ ] Watch for user feedback
- [ ] Check performance metrics
- [ ] Verify no production issues
- [ ] Document any issues found
- [ ] Plan fixes for any bugs

## Rollback Plan (if needed)

If critical issues found:

```sql
-- 1. Drop table (CAUTION: Deletes all commission data)
DROP TABLE IF EXISTS lead_commissions CASCADE;

-- 2. Remove permission columns
ALTER TABLE user_permissions 
DROP COLUMN IF EXISTS can_view_commissions,
DROP COLUMN IF EXISTS can_manage_commissions,
DROP COLUMN IF EXISTS can_mark_commissions_paid;

-- 3. Redeploy previous version of code
git revert [commit-hash]
vercel --prod
```

- [ ] Backup data before rollback
- [ ] Notify users of rollback
- [ ] Investigate root cause
- [ ] Fix issues in development
- [ ] Redeploy when stable

## Sign-Off

Deployment completed by: ___________________________

Date: ___________________________

All tests passed: ⬜ YES  ⬜ NO

Issues found: _________________________________________

__________________________________________________________

__________________________________________________________

Notes: _______________________________________________

__________________________________________________________

__________________________________________________________

__________________________________________________________

---

**🎉 When all boxes are checked, the system is ready for production use!**
