# Material/Work Order Date & Status Synchronization Plan

**Created**: December 20, 2024  
**Status**: In Progress - Phase 3 Complete ✅ | Phase 3 Issues Fixed ✅  
**Priority**: High

## Recent Fixes (December 21, 2024)

### Issue 1: Calendar Event Edit Error (FIXED ✅)
**Problem**: When trying to change a material order or work order date from the calendar, got error:
```
invalid input syntax for type uuid: "undefined"
```

**Root Cause**: Parameter name mismatch in the event update call. The component was passing `id: existingEvent.id` but the hook expected `eventId: existingEvent.id`.

**Solution**: 
- Fixed the parameter name in `event-quick-add-modal.tsx` from `id` to `eventId`
- Restored the Edit button for all events including linked ones
- Added informational text that date changes on linked events will sync to their orders
- **Two-way sync now works properly** - you can edit dates from calendar OR from the order forms

### Issue 2: Work Orders Not Creating Calendar Events (FIXED ✅)
**Problem**: When creating a work order with a scheduled date, it wasn't automatically creating a calendar event. This meant work orders didn't appear on the calendar.

**Root Cause**: The `useCreateWorkOrder` hook didn't have logic to automatically create a calendar event when a work order was created with a `scheduled_date`.

**Solution**:
- Modified `use-work-orders.ts` `useCreateWorkOrder` hook to automatically call `createEventFromLaborOrder` when a work order is created with a scheduled date
- This creates a `PRODUCTION_LABOR` event type linked to the work order
- Maintains consistency with material orders which already had this behavior
- Calendar event creation failure doesn't fail the work order creation (non-blocking)

### Files Modified
- ✅ `components/admin/calendar/event-detail-modal.tsx`
- ✅ `lib/hooks/use-work-orders.ts`

---

## Overview

Unify date management and simplify status workflow for material orders and work orders to ensure one source of truth for dates that syncs bidirectionally between orders and calendar events.

---

## Current Issues

1. **Date fragmentation**: Date in email dialog ≠ date in order ≠ date in calendar
2. **Multiple calendar events**: Updating date creates duplicate events instead of moving existing one
3. **Overcomplicated statuses**: Too many status options, unclear workflow
4. **One-way sync**: Calendar changes don't update orders, order changes don't update calendar

---

## Goals

1. **Single source of truth** for dates (order date = calendar event date)
2. **Simplified status workflow** (draft → scheduled → completed → paid → cancelled)
3. **Bidirectional sync** (order ↔ calendar)
4. **No duplicate events** (one order = one calendar event max)

---

## New Status Workflow

### Material Orders
- `draft` - Order created, no date set (default)
- `scheduled` - Date set, order scheduled for delivery
- `completed` - Materials delivered/received
- `paid` - Invoice paid in full
- `cancelled` - Order cancelled (manual)

### Work Orders
- `draft` - Order created, no date set (default)
- `scheduled` - Date set, work scheduled
- `completed` - Work finished
- `paid` - Invoice paid in full
- `cancelled` - Order cancelled (manual)

### Auto-Status Updates
```typescript
// When date is set
if (date && status === 'draft') {
  status = 'scheduled'
}
```

### Manual Transitions
- `draft → scheduled`: Automatic when date is set
- `any → cancelled`: Manual "Cancel Order" button
- `scheduled → completed`: Manual "Mark Completed" button
- `completed → paid`: Manual "Mark Paid" button (existing)

### Removed Statuses
- ❌ `pending` → replaced by `draft`
- ❌ `ordered` → replaced by `scheduled`
- ❌ `in_transit` → unnecessary
- ❌ `delivered` → replaced by `completed`
- ❌ `received` → replaced by `completed`
- ❌ `in_progress` → replaced by `scheduled`

---

## Date Synchronization Scenarios

### A. Email PO Dialog → Order → Calendar
```
User sets date in email dialog
  ↓
1. Save to order.expected_delivery_date (or scheduled_date)
2. Check if calendar event exists for this order
3. If exists: UPDATE event.event_date
4. If not: CREATE new calendar event
5. Update order.status = 'scheduled'
```

### B. Order Detail View → Calendar
```
User edits date in order detail
  ↓
1. Update order.expected_delivery_date
2. Find calendar event by material_order_id
3. Update event.event_date (or create if missing)
4. Update order.status = 'scheduled' if was 'draft'
```

### C. Calendar Drag/Drop → Order
```
User drags calendar event to new date
  ↓
1. Update event.event_date
2. Find linked order by material_order_id or labor_order_id
3. Update order.expected_delivery_date or scheduled_date
4. Invalidate order queries for UI update
```

---

## Implementation Phases

### Phase 1: Database & Status Cleanup
**Files**: `supabase/migrations/[timestamp]_simplify_order_statuses.sql`

1. Update `material_orders` status enum
2. Update `work_orders` status enum
3. Migrate existing data to new statuses
4. Update TypeScript types

**Migration SQL**:
```sql
-- Update material_orders status enum
ALTER TYPE material_order_status RENAME TO material_order_status_old;
CREATE TYPE material_order_status AS ENUM ('draft', 'scheduled', 'completed', 'paid', 'cancelled');
ALTER TABLE material_orders 
  ALTER COLUMN status TYPE material_order_status 
  USING (
    CASE 
      WHEN status::text IN ('pending', 'draft') THEN 'draft'::material_order_status
      WHEN status::text IN ('ordered', 'in_transit', 'scheduled') THEN 'scheduled'::material_order_status
      WHEN status::text IN ('delivered', 'received', 'completed') THEN 'completed'::material_order_status
      WHEN status::text = 'paid' THEN 'paid'::material_order_status
      WHEN status::text = 'cancelled' THEN 'cancelled'::material_order_status
      ELSE 'draft'::material_order_status
    END
  );
DROP TYPE material_order_status_old;

-- Update work_orders status enum
ALTER TYPE work_order_status RENAME TO work_order_status_old;
CREATE TYPE work_order_status AS ENUM ('draft', 'scheduled', 'completed', 'paid', 'cancelled');
ALTER TABLE work_orders 
  ALTER COLUMN status TYPE work_order_status 
  USING (
    CASE 
      WHEN status::text IN ('pending', 'draft') THEN 'draft'::work_order_status
      WHEN status::text = 'scheduled' THEN 'scheduled'::work_order_status
      WHEN status::text IN ('in_progress', 'completed') THEN 'completed'::work_order_status
      WHEN status::text = 'paid' THEN 'paid'::work_order_status
      WHEN status::text = 'cancelled' THEN 'cancelled'::work_order_status
      ELSE 'draft'::work_order_status
    END
  );
DROP TYPE work_order_status_old;
```

---

### Phase 2: Calendar Event Uniqueness
**Files**: 
- `lib/api/calendar.ts`
- `lib/api/material-orders.ts`
- `components/admin/leads/material-order-card.tsx`

1. Add `findEventByMaterialOrderId(orderId)` helper
2. Add `findEventByLaborOrderId(orderId)` helper
3. Update email PO flow to check for existing event
4. Update/create event logic (not always create)

**New API Functions**:
```typescript
// lib/api/calendar.ts
export async function findEventByMaterialOrderId(
  companyId: string,
  materialOrderId: string
): Promise<ApiResponse<CalendarEvent | null>>

export async function findEventByLaborOrderId(
  companyId: string,
  laborOrderId: string
): Promise<ApiResponse<CalendarEvent | null>>

export async function updateOrCreateEventFromMaterialOrder(
  companyId: string,
  materialOrderId: string,
  deliveryDate: string,
  leadId: string,
  leadName: string,
  orderNumber: string,
  createdBy: string,
  assignedUsers?: string[]
): Promise<ApiResponse<CalendarEvent>>
```

---

### Phase 3: Bidirectional Sync Functions ✅ COMPLETE
**Files**: 
- ✅ `lib/api/calendar.ts` - Added sync functions
- ✅ `lib/hooks/use-calendar.ts` - Added React Query hooks
- ✅ `components/admin/leads/material-order-detail-dialog.tsx` - Integrated sync

**Completed**:
1. ✅ Added `updateMaterialOrderDate()` - syncs material order date changes to calendar
2. ✅ Added `updateWorkOrderDate()` - syncs work order date changes to calendar
3. ✅ Existing `updateEvent()` already syncs calendar changes back to orders
4. ✅ Created React Query hooks: `useUpdateMaterialOrderDate()`, `useUpdateWorkOrderDate()`
5. ✅ Integrated into material order detail dialog
6. ✅ Handles edge case: date removal deletes calendar event

**API Functions**:
```typescript
// lib/api/calendar.ts - NEW FUNCTIONS
export async function updateMaterialOrderDate(
  companyId: string,
  materialOrderId: string,
  deliveryDate: string | null
): Promise<ApiResponse<void>> {
  // 1. Update material_orders.expected_delivery_date
  // 2. Find calendar event by material_order_id
  // 3. If date set: update event OR create if missing
  // 4. If date null: delete event
}

export async function updateWorkOrderDate(
  companyId: string,
  laborOrderId: string,
  scheduledDate: string | null
): Promise<ApiResponse<void>> {
  // Same pattern for work orders
}

// lib/api/calendar.ts - EXISTING FUNCTION (already handles reverse sync)
export async function updateEvent(
  eventId: string,
  updates: CalendarEventUpdate
): Promise<ApiResponse<CalendarEvent>> {
  // Updates calendar event
  // Auto-syncs to material_orders.expected_delivery_date
  // Auto-syncs to work_orders.scheduled_date
}
```

**React Query Hooks**:
```typescript
// lib/hooks/use-calendar.ts
export function useUpdateMaterialOrderDate() {
  // Mutation hook for updating material order date
  // Invalidates: calendar-events, material-orders, calendar-events-lead
}

export function useUpdateWorkOrderDate() {
  // Mutation hook for updating work order date
  // Invalidates: calendar-events, work-orders, calendar-events-lead
}
```

---

### Phase 4: UI Updates (IN PROGRESS 🔄)
  scheduledDate: string | null,
  companyId: string
): Promise<ApiResponse<WorkOrder>> {
  // Same pattern as material orders
}

// lib/api/calendar.ts
export async function updateEventDate(
  eventId: string,
  newDate: string
): Promise<ApiResponse<CalendarEvent>> {
  // 1. Update calendar event date
  // 2. Find linked material_order_id or labor_order_id
  // 3. Update order date to match
  // 4. Return updated event
}
```

---

### Phase 4: UI Updates
**Files**: 
- `components/admin/leads/material-order-card.tsx`
- `components/admin/leads/work-order-card.tsx`
- `components/admin/calendar/calendar-page-client.tsx`

1. Add date picker to MaterialOrderCard detail section
2. Add date picker to WorkOrderCard detail section
3. Update status badges to use new statuses
4. Remove old status buttons
5. Add "Mark Completed" and "Cancel Order" buttons
6. Add calendar drag/drop sync handler

**UI Changes**:

**MaterialOrderCard Detail Section**:
```tsx
<div>
  <Label>Expected Delivery Date</Label>
  <Input 
    type="date"
    value={order.expected_delivery_date || ''}
    onChange={(e) => handleDateChange(e.target.value)}
  />
</div>

<div className="flex gap-2">
  {order.status === 'scheduled' && (
    <Button onClick={handleMarkCompleted}>Mark Completed</Button>
  )}
  {order.status === 'completed' && (
    <Button onClick={handleMarkPaid}>Mark Paid</Button>
  )}
  {order.status !== 'cancelled' && order.status !== 'paid' && (
    <Button variant="destructive" onClick={handleCancel}>Cancel Order</Button>
  )}
</div>
```

**Status Badge Colors**:
```tsx
const statusConfig = {
  draft: { label: 'Draft', icon: Clock, color: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Scheduled', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  paid: { label: 'Paid', icon: DollarSign, color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-700' },
}
```

---

### Phase 5: Testing Checklist

#### Date Sync Tests
- [ ] Set date in email dialog → verify order date updated
- [ ] Set date in email dialog → verify calendar event created
- [ ] Set date in email dialog → verify status = 'scheduled'
- [ ] Change date in order detail → verify calendar event moves
- [ ] Drag calendar event → verify order date updates
- [ ] Delete order → verify calendar event deleted
- [ ] Delete calendar event → order still exists (expected)

#### Status Tests
- [ ] New order starts as 'draft'
- [ ] Setting date changes 'draft' → 'scheduled'
- [ ] "Mark Completed" changes 'scheduled' → 'completed'
- [ ] "Mark Paid" changes 'completed' → 'paid'
- [ ] "Cancel Order" changes any → 'cancelled'
- [ ] Calendar event status syncs with order status

#### Edge Cases
- [ ] Order with no date shows empty date field
- [ ] Clearing date removes calendar event
- [ ] Multiple orders for same lead work correctly
- [ ] Past dates are allowed (for record keeping)
- [ ] Cancelled orders don't show action buttons
- [ ] Paid orders only show "Cancel" button

---

## Files to Modify Summary

### Database
- [x] `supabase/migrations/20241220000005_simplify_order_statuses.sql` ✅

### Types
- [x] `lib/types/material-orders.ts` - Update MaterialOrderStatus enum ✅
- [x] `lib/types/work-orders.ts` - Update WorkOrderStatus enum ✅

### API Functions
- [ ] `lib/api/material-orders.ts` - Add `updateMaterialOrderDate()`
- [ ] `lib/api/work-orders.ts` - Add `updateWorkOrderDate()`
- [ ] `lib/api/calendar.ts` - Add helper functions and update mutations

### Components
- [ ] `components/admin/leads/material-order-card.tsx` - Date picker + status updates
- [ ] `components/admin/leads/work-order-card.tsx` - Date picker + status updates
- [ ] `components/admin/leads/send-email-dialog.tsx` - Use update-or-create logic
- [ ] `components/admin/calendar/calendar-page-client.tsx` - Sync on drag/drop

### Hooks (if needed)
- [ ] `lib/hooks/use-material-orders.ts` - Add date update mutation
- [ ] `lib/hooks/use-work-orders.ts` - Add date update mutation
- [ ] `lib/hooks/use-calendar.ts` - Update event mutation to sync orders

---

## Success Criteria

1. ✅ Only ONE calendar event per order (no duplicates)
2. ✅ Order date and calendar event date always match
3. ✅ Changing date in any location updates everywhere
4. ✅ Simple, clear status workflow (5 statuses total)
5. ✅ Deleting order deletes calendar event
6. ✅ Status auto-updates when date is set
7. ✅ Manual status transitions work correctly
8. ✅ UI shows correct date everywhere

---

## Future Enhancements (Post-MVP)

- Email notifications when order status changes
- Automatic reminders X days before scheduled date
- Bulk status updates
- Status history/audit log
- Custom status colors per company

---

## Notes

- **Date validation**: No restriction on past dates (for record keeping)
- **Partial payments**: Not supported (binary paid/unpaid)
- **Calendar event status**: Syncs with order status
- **Cancelled orders**: Manual status, not soft delete
- **Lead name in events**: Now properly loaded from order.lead relationship

---

**Next Steps**: 
1. Commit current progress
2. Start Phase 1 (Database migration)
3. Progress through phases sequentially
