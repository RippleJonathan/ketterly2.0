# Lead Commission Tracking System - Implementation Complete

## Overview
Complete commission tracking system for leads in Ketterly CRM that allows tracking multiple commissions per lead with different payment triggers and commission structures.

---

## Files Created/Modified

### Database Migration
- **`supabase/migrations/20241212000002_lead_commissions.sql`** - NEW
  - Creates `lead_commissions` table with full schema
  - Adds RLS policies for company isolation
  - Adds 3 new permission columns to `user_permissions`
  - Updates default role permissions
  - Creates indexes and triggers

### Type Definitions
- **`lib/types/commissions.ts`** - NEW
  - `LeadCommission`, `LeadCommissionInsert`, `LeadCommissionUpdate` interfaces
  - `CommissionSummary` interface
  - `CommissionFormData` helper type
  - Type-safe commission types and statuses

### API Layer
- **`lib/api/lead-commissions.ts`** - NEW
  - `getLeadCommissions()` - Fetch all commissions for a lead
  - `getUserCommissions()` - Fetch user's commissions across leads
  - `getCommissionsByStatus()` - Filter by status for reporting
  - `getLeadCommissionSummary()` - Calculate totals (owed, paid, pending)
  - `createLeadCommission()` - Create new commission
  - `updateLeadCommission()` - Update commission details
  - `deleteLeadCommission()` - Soft delete
  - `markCommissionPaid()` - Mark as paid with timestamp
  - `calculateCommission()` - Helper for calculations

### React Query Hooks
- **`lib/hooks/use-lead-commissions.ts`** - NEW
  - `useLeadCommissions()` - Query for lead
  - `useUserCommissions()` - Query for user
  - `useCommissionsByStatus()` - Query by status
  - `useLeadCommissionSummary()` - Query summary
  - `useCreateLeadCommission()` - Mutation
  - `useUpdateLeadCommission()` - Mutation
  - `useDeleteLeadCommission()` - Mutation
  - `useMarkCommissionPaid()` - Mutation

### UI Components
- **`components/admin/leads/commissions-tab.tsx`** - NEW
  - Main tab component with summary cards
  - Table showing all commissions
  - Permission-based UI (hide/show based on permissions)
  - Integrated with all dialogs

- **`components/admin/leads/commission-dialog.tsx`** - NEW
  - Add/Edit commission form
  - User selector (company users dropdown)
  - Commission plan selector (optional)
  - Commission type (percentage/flat/custom)
  - Live calculation preview
  - Payment trigger selection
  - Full validation

- **`components/admin/leads/mark-commission-paid-dialog.tsx`** - NEW
  - Simple mark-as-paid dialog
  - Shows commission details
  - Payment notes field
  - Records paid date and paid by user

### Integration
- **`app/(admin)/admin/leads/[id]/page.tsx`** - MODIFIED
  - Added "Commissions" tab with Banknote icon
  - Imported CommissionsTab component
  - Added tab content rendering

### Permissions (Already Added)
- **`lib/types/users.ts`** - MODIFIED (permissions already exist)
  - Added to `UserPermissions` interface:
    - `can_view_commissions`
    - `can_manage_commissions`
    - `can_mark_commissions_paid`
  - Added to `ALL_PERMISSIONS` array
  - Added to `PERMISSION_LABELS`
  - Added to `PERMISSION_CATEGORIES` under 'Commissions'
  - Added to role defaults (admin, office, sales_manager, sales, production, marketing)

---

## Database Schema

### `lead_commissions` Table

```sql
CREATE TABLE public.lead_commissions (
  id UUID PRIMARY KEY,
  company_id UUID (FK companies) -- Multi-tenant isolation
  lead_id UUID (FK leads)
  user_id UUID (FK users) -- Who gets the commission
  commission_plan_id UUID (FK commission_plans, nullable)
  
  -- Commission structure
  commission_type TEXT (percentage|flat_amount|custom)
  commission_rate NUMERIC(5,2) -- 0-100 if percentage
  flat_amount NUMERIC(10,2) -- $ if flat
  calculated_amount NUMERIC(10,2) -- Final commission owed
  base_amount NUMERIC(10,2) -- What commission is calculated on
  
  -- Payment trigger
  paid_when TEXT (when_deposit_paid|when_job_completed|when_final_payment|custom)
  
  -- Status
  status TEXT (pending|approved|paid|cancelled)
  paid_at TIMESTAMPTZ
  paid_by UUID (FK users)
  payment_notes TEXT
  notes TEXT
  
  -- Metadata
  created_by UUID (FK users)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  deleted_at TIMESTAMPTZ
)
```

### New Permissions (added to `user_permissions`)
- `can_view_commissions` - View commissions tab
- `can_manage_commissions` - Add/edit/delete commissions
- `can_mark_commissions_paid` - Mark commissions as paid

---

## Permission Setup by Role

| Role | View | Manage | Mark Paid |
|------|------|--------|-----------|
| Admin | ✅ | ✅ | ✅ |
| Office | ✅ | ✅ | ✅ |
| Sales Manager | ✅ | ✅ | ❌ |
| Sales | ✅ | ❌ | ❌ |
| Production | ❌ | ❌ | ❌ |
| Marketing | ❌ | ❌ | ❌ |

---

## Features Implemented

### ✅ Commission Management
- Create multiple commissions per lead
- Edit commission details (before paid)
- Delete commissions (soft delete)
- Three commission types:
  - **Percentage** - Calculate % of base amount
  - **Flat Amount** - Fixed dollar amount
  - **Custom** - Manual entry

### ✅ Payment Triggers
- When Deposit Paid
- When Job Completed
- When Final Payment Received
- Custom trigger

### ✅ Commission Tracking
- Status workflow: pending → approved → paid → cancelled
- Track who paid commission and when
- Payment notes for reference
- Commission plans integration (optional)

### ✅ Summary Dashboard
- Total owed across all commissions
- Total paid
- Total pending
- Total approved
- Count of each status

### ✅ Permission-Based Access
- Hide tab if no `can_view_commissions`
- Hide "Add" button if no `can_manage_commissions`
- Hide "Mark as Paid" if no `can_mark_commissions_paid`
- Hide Edit/Delete for paid commissions

### ✅ Multi-Tenant Security
- All queries filter by `company_id`
- RLS policies enforce company isolation
- Cannot view/edit other companies' commissions

### ✅ Live Calculations
- Commission amount calculated automatically
- Shows preview in dialog before saving
- Based on commission type and rate

### ✅ Responsive Design
- Mobile-friendly tables
- Collapsible summary cards
- Optimized for all screen sizes

---

## How to Run Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20241212000002_lead_commissions.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Verify success (should see "Success" message)

### Option 2: Node Script (if exec_sql RPC exists)
```bash
node run-migration.js supabase/migrations/20241212000002_lead_commissions.sql
```

---

## Testing Guide

### 1. Test Migration
```sql
-- Verify table exists
SELECT * FROM lead_commissions LIMIT 1;

-- Verify permissions columns added
SELECT can_view_commissions, can_manage_commissions, can_mark_commissions_paid 
FROM user_permissions LIMIT 1;

-- Check admin permissions (should all be true)
SELECT u.full_name, u.role, 
       p.can_view_commissions, 
       p.can_manage_commissions, 
       p.can_mark_commissions_paid
FROM users u
JOIN user_permissions p ON p.user_id = u.id
WHERE u.role = 'admin';
```

### 2. Test UI as Admin
1. Log in as admin user
2. Navigate to any lead detail page
3. Click "Commissions" tab (should appear with Banknote icon)
4. Should see:
   - Summary cards (all showing $0.00)
   - "Add Commission" button
   - Empty state message

### 3. Test Commission Creation
1. Click "Add Commission"
2. Fill out form:
   - Select a user
   - Choose commission type (e.g., Percentage)
   - Enter rate (e.g., 10%)
   - Enter base amount (e.g., $10,000)
   - Select "When Final Payment Received"
   - Add notes (optional)
3. Should see calculated amount: $1,000.00
4. Click "Create Commission"
5. Should see success toast
6. Commission appears in table
7. Summary cards update

### 4. Test Commission Editing
1. Click pencil icon on a commission
2. Change rate to 15%
3. Calculated amount updates to $1,500
4. Click "Update Commission"
5. Table updates with new amount

### 5. Test Mark as Paid
1. Click checkmark icon on pending commission
2. Dialog shows commission details
3. Add payment notes (e.g., "Check #1234")
4. Click "Confirm Payment"
5. Status badge changes to green "Paid"
6. Paid date shows today
7. "Paid by" shows current user
8. Summary updates (moves from pending to paid)

### 6. Test Permissions as Sales
1. Log in as sales role user
2. Navigate to lead detail
3. Click "Commissions" tab
4. Should see commissions (can_view_commissions = true)
5. "Add Commission" button should be hidden (can_manage_commissions = false)
6. Edit/Delete buttons should be hidden
7. "Mark as Paid" button should be hidden (can_mark_commissions_paid = false)

### 7. Test Multi-Tenant Isolation
1. Create commission for Company A lead
2. Log in as Company B user
3. Navigate to Company A's lead (should 404 or be inaccessible)
4. Try API call directly (should return empty array due to RLS)

### 8. Test Calculation Types

**Percentage Commission:**
- Type: Percentage
- Rate: 10%
- Base: $10,000
- Expected: $1,000

**Flat Amount:**
- Type: Flat Amount
- Amount: $500
- Base: Any
- Expected: $500

**Multiple Commissions:**
- Add 3 commissions to one lead
- User A: 10% of $10,000 = $1,000
- User B: 5% of $10,000 = $500
- User C: Flat $250 = $250
- Total Owed: $1,750

### 9. Test Status Workflow
1. Create commission (status: pending)
2. Summary shows in "Pending" card
3. Mark as paid
4. Status changes to "paid"
5. Summary moves from "Pending" to "Paid"
6. Cannot edit or delete paid commission

### 10. Test Delete
1. Create new commission
2. Click trash icon
3. Confirmation dialog appears
4. Click "Delete"
5. Commission removed from table
6. Summary updates
7. Verify soft delete: `deleted_at IS NOT NULL` in database

---

## API Usage Examples

### Get Lead Commissions
```typescript
const { data } = await getLeadCommissions(leadId, companyId)
// Returns: LeadCommissionWithRelations[]
```

### Create Commission
```typescript
const commission = await createLeadCommission(leadId, companyId, {
  user_id: '123',
  commission_type: 'percentage',
  commission_rate: 10,
  base_amount: 10000,
  calculated_amount: 1000,
  paid_when: 'when_final_payment',
  created_by: currentUserId,
})
```

### Mark as Paid
```typescript
const result = await markCommissionPaid(
  commissionId,
  companyId,
  currentUserId,
  'Check #1234'
)
// Updates status to 'paid', sets paid_at and paid_by
```

---

## Known Limitations / Future Enhancements

### Current Limitations
1. **Base Amount Manual Entry** - Currently user enters base amount manually. Could auto-populate from quote total.
2. **Commission Plans** - Integration exists but plans must be created separately.
3. **Approval Workflow** - "Approved" status exists but no approval process UI.
4. **Reporting** - No dedicated commission reports page (just per-lead view).
5. **Email Notifications** - No email sent when commission is paid.

### Future Enhancements
1. **Auto-populate Base Amount**
   - Pull from lead's accepted quote total
   - Update when quote changes
   
2. **Approval Workflow UI**
   - "Approve" button for managers
   - Pending → Approved → Paid flow
   - Approval required before payment
   
3. **Commission Reports Page**
   - View all commissions across all leads
   - Filter by user, status, date range
   - Export to CSV
   - Charts and analytics
   
4. **Commission Plans UI**
   - Create/edit commission plans
   - Apply plan to multiple users
   - Templates for common structures
   
5. **Automated Triggers**
   - Auto-mark commission paid when final payment received
   - Status updates based on lead status
   - Webhooks for external accounting systems
   
6. **Email Notifications**
   - Notify user when commission created
   - Notify when commission paid
   - Monthly commission statements
   
7. **Split Commissions**
   - Split one commission between multiple users
   - Percentage-based splits
   - Primary/secondary rep tracking
   
8. **Historical Tracking**
   - Audit log of all commission changes
   - Track recalculations
   - Version history

---

## Troubleshooting

### Issue: Commissions Tab Not Appearing
**Solution:**
1. Check if user has `can_view_commissions` permission
2. Verify tab is in tabs array in `page.tsx`
3. Check browser console for import errors

### Issue: "Add Commission" Button Hidden
**Solution:**
1. Check `can_manage_commissions` permission
2. Verify user is not in sales/production role
3. Check permission was granted in database

### Issue: Cannot Mark as Paid
**Solution:**
1. Check `can_mark_commissions_paid` permission
2. Verify commission status is not already 'paid'
3. Check user is admin or office role

### Issue: Empty Commission List
**Solution:**
1. Verify company_id matches in query
2. Check RLS policies are active
3. Ensure commissions.deleted_at IS NULL
4. Check user's company_id matches lead's company_id

### Issue: Calculated Amount Wrong
**Solution:**
1. Verify commission type matches rate/amount
2. Check `calculateCommission()` function logic
3. Ensure base_amount is correct
4. Test calculation: percentage = base * (rate / 100)

### Issue: Summary Not Updating
**Solution:**
1. Check React Query cache invalidation
2. Verify `invalidateQueries` runs after mutations
3. Refresh page to force refetch
4. Check `getLeadCommissionSummary()` query

---

## Production Checklist

Before deploying to production:

- [ ] Run migration in production database
- [ ] Verify RLS policies are active
- [ ] Test with real user accounts (all roles)
- [ ] Verify multi-tenant isolation works
- [ ] Test on mobile devices
- [ ] Check performance with 50+ commissions per lead
- [ ] Verify permission checks on server side
- [ ] Test edge cases (negative amounts, zero amounts, etc.)
- [ ] Set up monitoring for commission mutations
- [ ] Document process for non-technical users
- [ ] Train admin users on commission management
- [ ] Create backup before deployment
- [ ] Test rollback procedure

---

## Support

For issues or questions about the commission system:
1. Check this documentation
2. Review migration SQL for schema details
3. Check console/network tab for API errors
4. Verify permissions in database
5. Test with admin account first

---

**Implementation Date:** December 12, 2024  
**Status:** ✅ Complete and Ready for Testing  
**Migration File:** `20241212000002_lead_commissions.sql`
