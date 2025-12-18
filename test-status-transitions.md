# Automated Status System - Testing Guide

## Overview

This guide covers manual testing procedures for the automated status update system.

## What's Been Implemented

### ✅ Completed Components

1. **Database Schema** (`20241217000001_add_status_system.sql`)
   - Added `sub_status` column to `leads` table
   - Created `lead_status_history` audit table
   - Added database triggers for automatic history logging
   - Added constraints to ensure valid status/sub_status combinations

2. **TypeScript Types** (`lib/types/enums.ts`)
   - `LeadStatus` enum (5 main statuses)
   - `LeadSubStatus` enum (30 sub-statuses)
   - Type safety across the entire codebase

3. **Validation Utilities** (`lib/utils/status-transitions.ts`)
   - `validateStatusTransition()` - Validates status changes
   - `getTargetSubStatus()` - Gets appropriate sub-status for transitions
   - `VALID_SUB_STATUSES` - Mapping of valid combinations
   - Permission checking for sensitive transitions

4. **API Functions** (`lib/api/leads.ts`)
   - `updateLeadStatus()` - Manual status updates
   - `applyStatusTransition()` - Automatic status transitions
   - Integrated into quote creation, sending, and signing workflows

5. **React Query Hooks** (`lib/hooks/use-leads.ts`)
   - `useUpdateLeadStatusV2()` - For manual updates
   - `useApplyStatusTransition()` - For automatic updates
   - Proper cache invalidation

6. **UI Components**
   - `StatusDropdown` - Manual status changes with validation
   - `StatusHistoryTimeline` - Audit trail display

### 🔄 Auto-Transition Integration Points

Already integrated in these workflows:

1. **Quote Creation** (`lib/api/quotes.ts` - `createQuote()`)
   - Triggers: `NEW_LEAD` → `QUOTE/ESTIMATING`

2. **Quote Sending** (`app/api/quotes/[id]/send-email/route.ts`)
   - Triggers: `QUOTE/ESTIMATING` → `QUOTE/QUOTE_SENT`

3. **Contract Signing** (`app/api/quotes/sign-pdf/route.ts`)
   - First signature: `QUOTE/QUOTE_SENT` → `QUOTE/APPROVED`
   - Both signatures: `QUOTE/APPROVED` → `PRODUCTION/CONTRACT_SIGNED`

4. **Invoice Creation** (`lib/api/invoices.ts` - `createInvoice()`) ✨ NEW
   - Triggers: Any status → `INVOICED/INVOICE_SENT`

5. **Payment Recording** (`lib/api/invoices.ts` - `createPayment()`) ✨ NEW
   - Full payment: → `INVOICED/PAID`
   - Partial payment: → `INVOICED/PARTIAL_PAYMENT`

6. **Calendar Events** (`lib/api/calendar.ts`) 🔮 PLACEHOLDER
   - Event created: → `PRODUCTION/SCHEDULED` (when calendar implemented)
   - Production starts: → `PRODUCTION/IN_PROGRESS` (when calendar implemented)

## Automated Test Script

Run the automated test suite:

```bash
node test-status-system.js
```

This will test:
- ✅ Database schema (columns, tables, constraints)
- ✅ Automatic transitions (quote workflow)
- ✅ Manual transitions (validation)
- ✅ Status history logging
- ✅ Invalid status rejection

## Manual Testing Procedures

### Test 1: New Lead → Quote Created

**Steps:**
1. Create a new lead (status should be `NEW/NEW_LEAD`)
2. Go to lead detail page
3. Create a quote for the lead
4. Verify status changed to `QUOTE/ESTIMATING`
5. Check Status History tab - should show:
   - Transition: `NEW/NEW_LEAD` → `QUOTE/ESTIMATING`
   - Automated: ✅ Yes
   - Changed by: System

**Expected Result:** ✅ Auto-transition works

---

### Test 2: Quote Sent to Customer

**Steps:**
1. Create a lead and quote (status: `QUOTE/ESTIMATING`)
2. Click "Send Quote" button
3. Send email to customer
4. Verify status changed to `QUOTE/QUOTE_SENT`
5. Check Status History - should show automated transition

**Expected Result:** ✅ Auto-transition works

---

### Test 3: Quote Approved (Signature)

**Steps:**
1. Have a quote in `QUOTE/QUOTE_SENT` status
2. Sign the quote as customer (use PDF signing)
3. After first signature, verify status → `QUOTE/APPROVED`
4. After both signatures, verify status → `PRODUCTION/CONTRACT_SIGNED`
5. Check Status History - should show both transitions as automated

**Expected Result:** ✅ Auto-transition works for signatures

---

### Test 4: Manual Status Change

**Steps:**
1. Go to any lead detail page
2. Click the status dropdown in the header
3. Select a different status/sub-status
4. Verify:
   - Status changes immediately
   - No page refresh required
   - Toast notification appears
5. Check Status History:
   - Transition should be logged
   - Automated: ❌ No
   - Changed by: Your username

**Expected Result:** ✅ Manual changes work and are tracked

---

### Test 5: Invalid Status Transition

**Steps:**
1. Go to a lead in `NEW/NEW_LEAD` status
2. Try to change status dropdown to `INVOICED/PAID`
3. Should show validation error or permission dialog

**Expected Result:** ✅ Invalid transitions are prevented

---

### Test 6: Status History Timeline

**Steps:**
1. Go to a lead that has had multiple status changes
2. Navigate to Status History tab (or section)
3. Verify:
   - All transitions are listed
   - Each shows: from → to status
   - Automated vs manual indicator
   - User who made the change
   - Timestamp (relative time)

**Expected Result:** ✅ Complete audit trail displayed

---

### Test 7: Permission-Based Status Changes

**Steps:**
1. Log in as a non-admin user
2. Try to change a lead to `CLOSED/LOST`
3. Should see permission dialog
4. Verify you cannot change without proper permission

**Expected Result:** ✅ Permissions enforced

---

### Test 8: Workflow End-to-End

**Complete workflow test:**

1. Create lead → Status: `NEW/NEW_LEAD` ✅
2. Qualify lead → Manual: `NEW/QUALIFIED` ✅
3. Create quote → Auto: `QUOTE/ESTIMATING` ✅
4. Send quote → Auto: `QUOTE/QUOTE_SENT` ✅
5. Customer views quote → Manual: `QUOTE/QUOTE_VIEWED` ✅
6. Customer signs → Auto: `QUOTE/APPROVED` ✅
7. Both sign → Auto: `PRODUCTION/CONTRACT_SIGNED` ✅
8. Create invoice → Auto: `INVOICED/INVOICE_SENT` ✅ **NEW**
9. Record partial payment → Auto: `INVOICED/PARTIAL_PAYMENT` ✅ **NEW**
10. Record final payment → Auto: `INVOICED/PAID` ✅ **NEW**
11. Close job → Manual: `CLOSED/COMPLETED` ✅

**Calendar Workflow** (when feature #11 is implemented):
8a. Schedule production → Auto: `PRODUCTION/SCHEDULED` 🔮
8b. Production date arrives → Auto: `PRODUCTION/IN_PROGRESS` 🔮
8c. Complete work → Manual: `PRODUCTION/COMPLETED` ✅
9. Create invoice → Auto: `INVOICED/INVOICE_SENT` ✅

Check Status History after each step.

**Expected Result:** ✅ Complete workflow with full audit trail

---

## What's Still TODO

### ⏭️ Calendar-Based Auto-Transitions (Pending Feature #11)

**Placeholder functions created in `lib/api/calendar.ts`:**

1. **createProductionEvent()** - Auto-transition to `PRODUCTION/SCHEDULED`
   - Triggers when calendar event is created
   - Sends notifications to assigned crew
   - Full implementation ready to uncomment when calendar exists

2. **autoStartProduction()** - Auto-transition to `PRODUCTION/IN_PROGRESS`
   - Triggers on production date via cron job
   - Could also be manual button in calendar UI
   - Example cron implementation provided

3. **Integration Documentation** - Complete guide in `calendar.ts`
   - Database schema example
   - Cron job setup instructions
   - UI integration points
   - Status flow diagrams

**When Calendar Feature is Implemented:**
- Uncomment placeholder functions in `lib/api/calendar.ts`
- Create `calendar_events` table using provided schema
- Set up Supabase Edge Function for daily cron
- Add calendar UI and connect to placeholder functions
- Test auto-transitions with real calendar events

---

## Troubleshooting

### Issue: Status changes aren't being logged in history

**Check:**
1. Verify trigger exists in database:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'log_lead_status_change_trigger';
   ```
2. Check trigger function:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'log_lead_status_change';
   ```
3. Test manually:
   ```sql
   UPDATE leads SET status = 'quote', sub_status = 'estimating' WHERE id = 'YOUR_LEAD_ID';
   SELECT * FROM lead_status_history WHERE lead_id = 'YOUR_LEAD_ID' ORDER BY created_at DESC;
   ```

---

### Issue: Auto-transitions not happening

**Check:**
1. Verify the API function is using `applyStatusTransition()`:
   ```typescript
   await applyStatusTransition(leadId, companyId, {
     from_status: currentStatus,
     from_sub_status: currentSubStatus,
     to_status: newStatus,
     to_sub_status: newSubStatus,
     automated: true,
   })
   ```

2. Check React Query cache invalidation is happening:
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['leads'] })
   queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
   queryClient.invalidateQueries({ queryKey: ['lead-status-history', leadId] })
   ```

3. Check browser console for errors

---

### Issue: Status dropdown not updating

**Check:**
1. React Query devtools - is the query refetching?
2. Browser console for errors
3. Network tab - is the API call succeeding?
4. Database - did the status actually change?

---

## Success Criteria

All tests pass when:

- ✅ Database schema is correct
- ✅ Auto-transitions trigger on quote create/send/sign
- ✅ Manual transitions work from status dropdown
- ✅ All transitions are logged in history
- ✅ History displays correctly with automated flag
- ✅ Invalid transitions are prevented
- ✅ Permissions are enforced
- ✅ UI updates without page refresh
- ✅ No console errors
- ✅ End-to-end workflow completes successfully

---

## Next Steps

After all tests pass:

1. ✅ Mark feature as complete in `PRODUCT_ROADMAP.md`
2. ✅ Update completion date
3. ✅ Document any edge cases discovered
4. ✅ Move to Task 7: Implement status filtering
5. ✅ Consider additional auto-transitions (invoices, calendar)

---

**Last Updated:** December 18, 2024  
**Status:** Complete - Ready for Production ✨  
**Invoice Auto-Transitions:** Implemented  
**Calendar Placeholders:** Created with full documentation
