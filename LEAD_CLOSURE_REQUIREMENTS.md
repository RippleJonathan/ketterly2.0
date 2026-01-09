# Lead Closure Requirements Analysis

**Date:** January 7, 2026  
**Status:** Design Document

---

## 🎯 Current System

### Automatic Closure Logic

**File:** `lib/utils/status-transitions.ts`

```typescript
export function getStatusAfterFullPayment(allExpensesPaid: boolean): StatusTransition {
  // Per user notes: Can only close when ALL payments received AND all expenses/commissions paid
  if (allExpensesPaid) {
    return {
      from_status: LeadStatus.INVOICED,
      from_sub_status: LeadSubStatus.PAID,
      to_status: LeadStatus.CLOSED,
      to_sub_status: LeadSubStatus.COMPLETED,
      automated: true,
      metadata: { action: 'fully_paid_and_expenses_settled' },
    }
  } else {
    return {
      from_status: LeadStatus.INVOICED,
      from_sub_status: null,
      to_status: LeadStatus.INVOICED,
      to_sub_status: LeadSubStatus.PAID,
      automated: true,
      metadata: { action: 'payment_received_full' },
    }
  }
}
```

**Current Behavior:**
- ✅ Checks if all expenses are paid via `allExpensesPaid` parameter
- ✅ Only auto-closes if `allExpensesPaid = true`
- ✅ Otherwise stays in `INVOICED/PAID` status

---

## 📋 Recommended Closure Requirements

### Required Conditions Before Closure:

#### 1. ✅ **All Invoices Fully Paid**
```typescript
// Check all invoices for this lead are paid
const { data: invoices } = await supabase
  .from('customer_invoices')
  .select('status, total_amount, amount_paid')
  .eq('lead_id', leadId)
  .is('deleted_at', null)

const allInvoicesPaid = invoices.every(inv => 
  inv.status === 'paid' && inv.amount_paid >= inv.total_amount
)
```

#### 2. ✅ **All Commissions Paid (or Approved)**
```typescript
// Check all commissions are paid or at least approved
const { data: commissions } = await supabase
  .from('lead_commissions')
  .select('status')
  .eq('lead_id', leadId)
  .is('deleted_at', null)

const allCommissionsSettled = commissions.every(comm => 
  comm.status === 'paid' || comm.status === 'approved'
)
```

**Business Rule Options:**
- **Strict:** All commissions must be `paid` before closure
- **Relaxed:** Commissions can be `approved` (payment pending) - **RECOMMENDED**
- **None:** Don't check commissions (not recommended)

#### 3. ✅ **All Change Orders Completed**
```typescript
// Check no pending change orders
const { data: changeOrders } = await supabase
  .from('change_orders')
  .select('status')
  .eq('lead_id', leadId)
  .is('deleted_at', null)

const allChangeOrdersComplete = changeOrders.every(co => 
  co.status === 'approved' || co.status === 'completed'
)
```

#### 4. ⚠️ **Production Status = Completed** (Optional but Recommended)
```typescript
// Verify production work is marked complete
const { data: lead } = await supabase
  .from('leads')
  .select('status, sub_status')
  .eq('id', leadId)
  .single()

const productionComplete = 
  lead.status === 'production' && lead.sub_status === 'completed' ||
  lead.status === 'invoiced'
```

#### 5. ⚠️ **Inspection Passed** (Optional - depends on business)
```typescript
// Check if inspection required and passed
const { data: production } = await supabase
  .from('production_schedules')
  .select('inspection_required, inspection_status')
  .eq('lead_id', leadId)
  .single()

const inspectionClear = 
  !production.inspection_required || 
  production.inspection_status === 'passed'
```

#### 6. ⚠️ **No Outstanding Issues** (Optional)
```typescript
// Check for any unresolved issues/tasks
const { data: issues } = await supabase
  .from('activities')
  .select('type, status')
  .eq('lead_id', leadId)
  .eq('type', 'issue')
  .neq('status', 'resolved')
  .is('deleted_at', null)

const noOpenIssues = issues.length === 0
```

---

## 🏗️ Implementation Plan

### Option 1: Automatic Closure (RECOMMENDED)

**When:** Final payment is recorded  
**Action:** Check all requirements, auto-close if met

```typescript
// In payments API after recording final payment
async function checkAndCloseLead(leadId: string, companyId: string) {
  const requirements = await checkClosureRequirements(leadId, companyId)
  
  if (requirements.canClose) {
    await applyStatusTransition(leadId, companyId, {
      to_status: LeadStatus.CLOSED,
      to_sub_status: LeadSubStatus.COMPLETED,
      automated: true,
      metadata: { 
        action: 'auto_closed',
        requirements: requirements.checks
      }
    })
  } else {
    // Stay in INVOICED/PAID
    await applyStatusTransition(leadId, companyId, {
      to_status: LeadStatus.INVOICED,
      to_sub_status: LeadSubStatus.PAID,
      automated: true,
      metadata: { 
        action: 'payment_complete_pending_closure',
        pending: requirements.pendingItems
      }
    })
    
    // Optional: Send notification to admin
    await createNotification({
      type: 'lead_ready_to_close',
      message: `Lead ready to close after: ${requirements.pendingItems.join(', ')}`,
      leadId
    })
  }
}
```

### Option 2: Manual Closure with Validation

**When:** Admin clicks "Close Lead" button  
**Action:** Validate requirements, show warnings if not met

```typescript
// UI shows "Close Lead" button when INVOICED/PAID
// Button click triggers validation
async function attemptLeadClosure(leadId: string) {
  const requirements = await checkClosureRequirements(leadId, companyId)
  
  if (!requirements.canClose) {
    // Show dialog with pending items
    showDialog({
      title: 'Cannot Close Lead',
      message: 'The following must be completed first:',
      items: requirements.pendingItems,
      actions: ['OK']
    })
    return
  }
  
  // Proceed with closure
  await closeLead(leadId)
}
```

### Option 3: Soft Close with Warnings (MOST FLEXIBLE)

**When:** Admin can close anytime, but gets warnings  
**Action:** Allow override with permission

```typescript
async function attemptLeadClosure(leadId: string, forceClose: boolean = false) {
  const requirements = await checkClosureRequirements(leadId, companyId)
  
  if (!requirements.canClose && !forceClose) {
    // Show warning dialog
    showConfirmDialog({
      title: 'Warning: Pending Items',
      message: 'The following are not complete:',
      items: requirements.pendingItems,
      warning: 'Are you sure you want to close this lead?',
      actions: [
        { label: 'Cancel', value: false },
        { label: 'Close Anyway', value: true, variant: 'destructive' }
      ]
    })
    return
  }
  
  // Close with metadata about what was pending
  await closeLead(leadId, requirements.pendingItems)
}
```

---

## 📝 Recommended Requirements Function

```typescript
// lib/utils/lead-closure-checks.ts

export interface ClosureRequirements {
  canClose: boolean
  checks: {
    invoicesPaid: boolean
    commissionsSettled: boolean
    changeOrdersComplete: boolean
    productionComplete: boolean
    inspectionPassed: boolean
    noOpenIssues: boolean
  }
  pendingItems: string[]
}

export async function checkClosureRequirements(
  leadId: string,
  companyId: string
): Promise<ClosureRequirements> {
  const supabase = createClient()
  
  const checks = {
    invoicesPaid: false,
    commissionsSettled: false,
    changeOrdersComplete: false,
    productionComplete: false,
    inspectionPassed: false,
    noOpenIssues: false,
  }
  
  const pendingItems: string[] = []
  
  // 1. Check invoices
  const { data: invoices } = await supabase
    .from('customer_invoices')
    .select('status, total_amount, amount_paid')
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
  
  checks.invoicesPaid = invoices?.every(inv => 
    inv.status === 'paid' && inv.amount_paid >= inv.total_amount
  ) ?? true
  
  if (!checks.invoicesPaid) {
    pendingItems.push('Unpaid invoices')
  }
  
  // 2. Check commissions
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select('status')
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
  
  checks.commissionsSettled = commissions?.every(comm => 
    comm.status === 'paid' || comm.status === 'approved'
  ) ?? true
  
  if (!checks.commissionsSettled) {
    pendingItems.push('Pending commissions')
  }
  
  // 3. Check change orders
  const { data: changeOrders } = await supabase
    .from('change_orders')
    .select('status')
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
  
  checks.changeOrdersComplete = changeOrders?.every(co => 
    co.status === 'approved' || co.status === 'completed'
  ) ?? true
  
  if (!checks.changeOrdersComplete) {
    pendingItems.push('Unapproved change orders')
  }
  
  // 4. Check production status
  const { data: lead } = await supabase
    .from('leads')
    .select('status, sub_status')
    .eq('id', leadId)
    .single()
  
  checks.productionComplete = 
    lead?.status === 'invoiced' || 
    (lead?.status === 'production' && lead?.sub_status === 'completed')
  
  if (!checks.productionComplete) {
    pendingItems.push('Production not completed')
  }
  
  // 5. Optional: Check inspection (if implemented)
  // ... add if needed
  checks.inspectionPassed = true // Default to true if not implemented
  
  // 6. Optional: Check open issues (if implemented)
  // ... add if needed
  checks.noOpenIssues = true // Default to true if not implemented
  
  // Can close only if ALL required checks pass
  const canClose = 
    checks.invoicesPaid &&
    checks.commissionsSettled &&
    checks.changeOrdersComplete &&
    checks.productionComplete
    // inspection and issues are optional
  
  return {
    canClose,
    checks,
    pendingItems,
  }
}
```

---

## 🎨 UI Implementation

### 1. Add "Close Lead" Button

**Location:** Lead detail page header  
**Visibility:** Show when `status = 'invoiced' && sub_status = 'paid'`  
**Permission:** `can_close_leads`

```tsx
// In lead detail page
{lead.status === 'invoiced' && lead.sub_status === 'paid' && canCloseLead && (
  <Button onClick={handleCloseLead}>
    <CheckCircle className="mr-2 h-4 w-4" />
    Close Lead
  </Button>
)}
```

### 2. Closure Validation Dialog

```tsx
function CloseLeadDialog({ leadId, open, onOpenChange }) {
  const [requirements, setRequirements] = useState<ClosureRequirements | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (open) {
      checkClosureRequirements(leadId).then(setRequirements).finally(() => setLoading(false))
    }
  }, [open, leadId])
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Lead</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div>Checking requirements...</div>
        ) : requirements?.canClose ? (
          <div>
            <p className="text-green-600 mb-4">✓ All requirements met</p>
            <Button onClick={handleClose}>Close Lead</Button>
          </div>
        ) : (
          <div>
            <p className="text-red-600 mb-4">Cannot close yet. Pending:</p>
            <ul className="list-disc pl-5 space-y-1">
              {requirements?.pendingItems.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Button onClick={() => onOpenChange(false)}>OK</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

## 📊 Summary

### Minimum Requirements (RECOMMENDED):
1. ✅ **All invoices paid**
2. ✅ **All commissions approved or paid**
3. ✅ **All change orders approved**
4. ✅ **Production status = completed**

### Optional Requirements:
5. ⚠️ Inspection passed (if applicable)
6. ⚠️ No open issues/tasks

### Implementation Approach:
- **Option 1** (Auto-close): Best for streamlined workflow
- **Option 3** (Soft warnings): Best for flexibility with accountability

### Files to Create:
1. `lib/utils/lead-closure-checks.ts` - Validation function
2. `components/admin/leads/close-lead-dialog.tsx` - UI component
3. Update payment recording to trigger auto-close check

### Permission Required:
- Add `can_close_leads` to permissions system (or reuse `can_manage_leads`)

---

**Estimated Implementation Time:** 4-6 hours  
**Priority:** Medium (good to have for workflow completeness)
