# Ketterly CRM - Status System Proposal

**Created:** December 17, 2024  
**Status:** Proposal - Pending Review

---

## 🎯 Goals

1. Simplify status tracking with 5 main statuses
2. Add sub-statuses for granular workflow tracking
3. Automate status transitions where possible
4. Add optional manual approval steps (with permissions)
5. Create audit trail for all status changes
6. Enable filtering/organizing leads by status

---

## 📊 Proposed Status Structure

### **1. NEW LEAD** 
**Main Status:** `new_lead`  
**Color:** Blue

**Sub-statuses:**
- `uncontacted` - Just came in, no action yet (DEFAULT)
- `contacted` - Initial contact made
- `qualified` - Customer is interested and qualified
- `measuring` - Measurement scheduled/in progress(remove this one)
- `not_qualified` - Not a good fit (dead end)

**Auto-transitions:**
- When first activity is logged → `uncontacted` → `contacted`
- When measurement scheduled → `measuring`

**Manual transitions:**
- Mark as qualified/not qualified (sales rep decision)
- Move to Quote status when ready

---

### **2. QUOTE**
**Main Status:** `quote`  
**Color:** Yellow/Orange

**Sub-statuses:**
- `estimating` - Creating the estimate (DEFAULT)
- `quote_sent` - Sent to customer for review
- `quote_viewed` - Customer opened/viewed quote
- `negotiating` - Back-and-forth on pricing(manager intervention)
- `approved` - Customer approved (ready for contract)
- `declined` - Customer said no (dead end)
- `expired` - Quote validity period passed (dead end)

**Auto-transitions:**
- When estimate created → `estimating`
- When estimate sent to customer → `quote_sent`
- When customer views quote → `quote_viewed`
- When customer approves quote → `approved`

**Manual transitions with optional approval:**
- `approved` → `production` (requires contract signature)(yeah when contract is signed it moves to production, office or production has to move beyond this)
- Move back to `estimating` if revisions needed
- Mark as `declined` or `expired`

---

### **3. PRODUCTION**
**Main Status:** `production`  
**Color:** Purple

**Sub-statuses:**
- `contract_signed` - Contract executed, not scheduled yet (DEFAULT)
- `scheduled` - Production date set
- `materials_ordered` - Materials on order
- `materials_received` - Materials arrived(remove)
- `in_progress` - Crew is on site working
- `completed` - Work finished
- `inspection_needed` - Requires inspection(manual but can be skipped)
- `inspection_passed` - Ready for final invoice(same)
- `on_hold` - Paused for some reason
- `cancelled` - Job cancelled (dead end)

**Auto-transitions:**
- When quote approved + contract signed → `contract_signed`
- When calendar event created → `scheduled`
- When material order placed → `materials_ordered`
- When material order marked received → `materials_received`
- When work order marked complete → `completed`

**Manual transitions:**
- Start production → `in_progress` (crew lead)
- Mark complete → `completed` (crew lead / PM)
- Request inspection → `inspection_needed`
- Pass inspection → `inspection_passed`
- Put on hold → `on_hold` (PM / office)
- Cancel job → `cancelled` (admin / office)

---

### **4. INVOICED**
**Main Status:** `invoiced`  
**Color:** Green

**Sub-statuses:**
- `draft` - Invoice being created (DEFAULT)
- `sent` - Invoice sent to customer
- `viewed` - Customer viewed invoice
- `partial_payment` - Some payment received
- `paid` - Fully paid
- `overdue` - Past due date
- `collections` - Sent to collections
- `written_off` - Bad debt (dead end)

**Auto-transitions:**
- When inspection passes OR work completes → `draft`
- When invoice sent → `sent`
- When payment recorded → `partial_payment` or `paid`
- When due date passes without payment → `overdue`

**Manual transitions:**
- Send to collections → `collections` (office / admin)
- Write off bad debt → `written_off` (admin only)

---

### **5. CLOSED**
**Main Status:** `closed`  
**Color:** Gray

**Sub-statuses:** Lets make sure when paid in full and all expenses/commissions paid in full then it can be closed
- `completed` - Successfully finished (DEFAULT)
- `lost` - Customer went with someone else
- `cancelled` - Cancelled before completion
- `archived` - Old job, archived for records

**Auto-transitions:**
- When fully paid → `closed` with sub-status `completed`

**Manual transitions:**
- Mark as lost → `lost`
- Mark as cancelled → `cancelled`
- Archive old records → `archived`

---

## 🔄 Automated Workflow Examples

### Example 1: Happy Path (New Lead → Closed)

```
1. Lead comes in                    → NEW LEAD (uncontacted)
2. Sales rep calls                  → NEW LEAD (contacted) - auto
3. Sales rep schedules measurement  → NEW LEAD (measuring) - auto
4. Sales rep creates estimate       → QUOTE (estimating) - auto
5. Estimate sent to customer        → QUOTE (quote_sent) - auto
6. Customer views quote             → QUOTE (quote_viewed) - auto
7. Customer approves                → QUOTE (approved) - auto
8. Contract signed                  → PRODUCTION (contract_signed) - auto
9. Office schedules production      → PRODUCTION (scheduled) - auto
10. Materials ordered               → PRODUCTION (materials_ordered) - auto
11. Materials arrive                → PRODUCTION (materials_received) - auto
12. Crew starts work                → PRODUCTION (in_progress) - manual
13. Crew finishes work              → PRODUCTION (completed) - manual
14. Inspection passed               → PRODUCTION (inspection_passed) - manual
15. Invoice created                 → INVOICED (draft) - auto
16. Invoice sent                    → INVOICED (sent) - auto
17. Payment received                → INVOICED (paid) - auto
18. Job closed                      → CLOSED (completed) - auto
```

### Example 2: Lost Deal

```
1. Lead comes in                    → NEW LEAD (uncontacted)
2. Sales rep calls                  → NEW LEAD (contacted) - auto
3. Not a good fit                   → NEW LEAD (not_qualified) - manual
4. Mark as lost                     → CLOSED (lost) - manual
```

### Example 3: Quote Declined

```
1. Lead comes in                    → NEW LEAD (uncontacted)
2. Sales rep calls                  → NEW LEAD (contacted) - auto
3. Estimate sent                    → QUOTE (quote_sent) - auto
4. Customer says no thanks          → QUOTE (declined) - manual
5. Mark as lost                     → CLOSED (lost) - manual
```

---

## 🔐 Permission-Based Manual Steps

Some transitions should require specific permissions:

| Transition | Permission Required | Reason |
|------------|-------------------|--------|
| Approve quote manually | `quotes_approve` | Protect revenue |
| Cancel production | `projects_manage` | Prevent accidental cancellation |
| Send to collections | `invoices_manage` | Legal/financial implications |
| Write off debt | Admin only | Financial decision |
| Archive records | `leads_delete` | Data management |

---

## 📝 Database Schema Changes Required

### 1. Add `sub_status` column to leads table

```sql
ALTER TABLE public.leads 
ADD COLUMN sub_status TEXT;

-- Update check constraint to include new statuses
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new_lead', 'quote', 'production', 'invoiced', 'closed'));
```

### 2. Create status transitions audit table

```sql
CREATE TABLE public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT NOT NULL,
  from_sub_status TEXT,
  to_status TEXT NOT NULL,
  to_sub_status TEXT,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  automated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX idx_lead_status_history_created_at ON lead_status_history(created_at);
```

### 3. Create status transition rules table (optional - for configurability)

```sql
CREATE TABLE public.status_transition_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  from_status TEXT NOT NULL,
  from_sub_status TEXT,
  to_status TEXT NOT NULL,
  to_sub_status TEXT,
  trigger_event TEXT NOT NULL, -- e.g., 'quote_sent', 'payment_received'
  auto_transition BOOLEAN DEFAULT true,
  requires_permission TEXT, -- e.g., 'quotes_approve'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🔔 Notification Integration

While this is primarily for organization, we should still notify users of important status changes:

**Notify on:**
- Lead assigned (new)
- Quote approved (sales rep + office)
- Production scheduled (crew + PM)
- Invoice paid (sales rep + office)
- Job on hold (PM + assigned crew)

**Respect user preferences:**
- Check `notification_preferences.lead_status_change`
- Only notify if enabled

---

## 🎨 UI Changes Required

### 1. Lead List View
- Filter by main status (tabs or dropdown)
- Sub-status badge on each lead card
- Status color coding
- Quick status change dropdown (with permission checks)

### 2. Lead Detail Page
- Status timeline visualization
- Current status + sub-status at top
- Manual status change button (if permitted)
- Status history section showing all transitions

### 3. Dashboard
- Leads grouped by status in kanban view
- Drag-and-drop to change status (optional)
- Status counts in sidebar

---

## 📅 Implementation Plan

### Phase 1: Database & Core Logic (4-6 hours)
1. Create database migration for new statuses
2. Add sub_status column
3. Create status_history table
4. Update TypeScript types/enums
5. Create status transition utility functions

### Phase 2: Auto-Transitions (4-6 hours)
6. Add status change logic to existing mutations:
   - createQuote → update lead to `quote/estimating`
   - sendQuote → update to `quote/quote_sent`
   - approveQuote → update to `quote/approved`
   - createProject → update to `production/contract_signed`
   - scheduleProduction → update to `production/scheduled`
   - recordPayment → update to `invoiced/paid` or `closed/completed`
7. Test all auto-transitions

### Phase 3: Manual Transitions UI (2-3 hours)
8. Add status change dropdown to lead detail page
9. Add permission checks
10. Create status history component

### Phase 4: Filtering & Organization (1-2 hours)
11. Add status filters to leads list
12. Update dashboard with status groups

---

## ❓ Questions for You

1. **Do these 5 main statuses + sub-statuses match your vision?**
2. **Any sub-statuses we should add/remove/rename?**
3. **Should we add a "Follow Up" status, or is that handled by sub-statuses?**
4. **Do you want a visual kanban board for status management?**
5. **Should status changes create an activity automatically?** (I recommend yes)
6. **Any status transitions that should ALWAYS require manual approval?**

---

Once you review and approve this structure, we'll start implementation!
