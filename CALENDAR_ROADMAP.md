# Calendar System - Complete Implementation Roadmap

**Feature:** Feature #11 - Calendar System  
**Estimated Time:** 30-40 hours  
**Difficulty:** ⭐⭐⭐⭐ Hard  
**Impact:** Critical  
**Status:** 🚧 In Progress  
**Started:** December 18, 2024

---

## 📋 Feature Overview

Mobile-first calendar system with multi-view support, automatic event creation from orders, multi-user assignment, and smart filtering.

---

## 🎯 Core Requirements

### Event Types (4 Total)

1. **Consultation** 🔵 (Blue)
   - Inspections, initial sales appointments
   - **Default duration:** 1 hour (adjustable)
   - **Permissions:** Everyone can create
   
2. **Production - Materials** 🟢 (Green)
   - Material deliveries
   - **Default duration:** All day (adjustable to specific time)
   - **Permissions:** Production Manager, Office, Admin only
   - **Auto-created from:** Material order `delivery_date`
   
3. **Production - Labor** 🟠 (Orange)
   - Installation work
   - **Default duration:** All day (adjustable to specific time)
   - **Permissions:** Production Manager, Office, Admin only
   - **Auto-created from:** Labor order production dates
   - **Reference:** Should link to corresponding material delivery if from same job
   
4. **Adjuster Meeting** 🔴 (Red)
   - Insurance adjuster appointments
   - **Default duration:** 1 hour (adjustable)
   - **Permissions:** Everyone can create
   
5. **Other/Miscellaneous** 🟣 (Purple)
   - Everything else
   - **Default duration:** 1 hour (adjustable)
   - **Permissions:** Everyone can create

### Event Properties

Each calendar event should have:
- `id` (UUID, primary key)
- `company_id` (UUID, multi-tenant)
- `lead_id` (UUID, nullable - not all events tied to leads)
- `event_type` (enum: 'consultation', 'production_materials', 'production_labor', 'adjuster_meeting', 'other')
- `title` (text)
- `description` (text, nullable)
- `event_date` (date)
- `start_time` (time, nullable - all-day events don't have time)
- `end_time` (time, nullable)
- `is_all_day` (boolean, default based on event type)
- `assigned_users` (UUID[], array of user IDs)
- `created_by` (UUID, user who created event)
- `location` (text, nullable - address/meeting location)
- `status` (enum: 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')
- `material_order_id` (UUID, nullable - links to material order)
- `labor_order_id` (UUID, nullable - links to labor order)
- `related_event_id` (UUID, nullable - links delivery to install from same job)
- `is_recurring` (boolean, default false)
- `recurrence_pattern` (jsonb, nullable - stores recurrence rules)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `deleted_at` (timestamptz, soft delete)

---

## 🎨 User Interface Requirements

### 1. Calendar Views (Desktop & Mobile)

#### Day View (Google Calendar Style)
- **Layout:** Vertical time slots (7am-7pm default, scrollable to 24hrs)
- **Events:** Blocks showing event title, time, assigned users
- **Click event:** Opens event detail modal
- **Click empty slot:** Opens quick-add event modal
- **Mobile:** Full-width, touch-friendly, swipe to change days

#### Week View (Block Style)
- **Layout:** 7 columns (Mon-Sun)
- **Event display:** Show event count per day (e.g., "3 events")
- **Click day:** Expands panel below showing list of that day's events
- **Mobile:** Horizontal scroll for days, tap day to see list below

#### Month View (Calendar Grid)
- **Layout:** Traditional calendar grid
- **Event display:** Dots or count per day (color-coded)
- **Click day:** Expands panel showing list of events
- **Mobile:** Optimized grid, tap to see day details

#### List View (Default on Mobile)
- **Layout:** Chronological list grouped by date
- **Format:**
  ```
  December 18, 2024
  ─────────────────────────────
  8:00 AM - Consultation
  John Doe - 123 Main St
  Assigned: Mike Johnson
  ─────────────────────────────
  10:30 AM - Adjuster Meeting
  Jane Smith - 456 Oak Ave
  Assigned: Sarah Davis, Mike Johnson
  ─────────────────────────────
  All Day - Production - Labor
  ABC Roofing Job
  Crew: Team A
  ─────────────────────────────
  
  December 19, 2024
  ...
  ```
- **Scroll:** Infinite scroll or pagination
- **Actions:** Tap event to see details, swipe for quick actions (edit, cancel)

### 2. View Switcher
- **Tabs:** Day | Week | Month | List
- **Desktop:** Horizontal tabs at top
- **Mobile:** Bottom tabs or dropdown selector
- **Default:** List view on mobile, Week view on desktop

### 3. Filtering & Search

#### Filter Options
- **By User:** "My Schedule" vs "All Team" vs specific user
- **By Event Type:** All | Consultations | Materials | Labor | Adjuster | Other
- **By Status:** All | Scheduled | Confirmed | Completed | Cancelled
- **By Date Range:** Today | This Week | This Month | Custom Range
- **By Lead:** Filter to show only events for specific lead (from lead detail page)

#### Filter UI
- **Desktop:** Sidebar or top bar with dropdowns
- **Mobile:** Filter icon opens modal/drawer with options

#### Search
- Search by:
  - Customer name
  - Address
  - Assigned user
  - Event title/description
- **Implementation:** Debounced search input (300ms)

### 4. Color Legend
- **Location:** Top-right corner or collapsible sidebar
- **Display:** Small card showing:
  ```
  🔵 Consultation
  🟢 Production - Materials
  🟠 Production - Labor
  🔴 Adjuster Meeting
  🟣 Other/Miscellaneous
  ```
- **Future:** Color by installer (show sub/crew colors)

### 5. Overbooking Indicator
- **Visual:** Event blocks with multiple overlapping events show:
  - Striped pattern or warning icon
  - Border color change (e.g., yellow border)
  - Tooltip: "User has 2 events at this time"
- **No blocking:** Allow creation but show warning

---

## 🔧 Functionality Requirements

### 1. Event Creation

#### Quick-Add Modal (Click Empty Slot or FAB)
- **Trigger:** 
  - Click empty time slot in Day view
  - Click "+ New Event" button
  - Click "Schedule Appointment" from lead detail page
- **Form Fields:**
  - Event Type (dropdown, required)
  - Title (auto-filled from lead if from lead page)
  - Lead (search/autocomplete, optional)
  - Date (date picker, pre-filled if clicked slot)
  - Time (time pickers, optional for all-day)
  - All Day (checkbox)
  - Duration (dropdown: 30min, 1hr, 2hr, 4hr, All Day)
  - Assigned Users (multi-select with checkboxes)
  - Location (text input or address autocomplete)
  - Description (textarea)
  - Notes (textarea)
- **Permissions Check:**
  - If Production type → require Production Manager, Office, or Admin role
  - Show error if user lacks permission
- **Submit:** Create event + show in calendar + send notifications

#### Full Event Form (Dedicated Page - Optional)
- Same fields as quick-add but with more options:
  - Status (dropdown)
  - Recurring event settings (if enabled)
  - Attachments/documents
  - Related events

### 2. Event Editing

#### Edit Modal
- **Trigger:** Click existing event
- **Permissions:**
  - Creator can edit their own events
  - Admin/Office can edit all events
  - Production events: Only Production Manager/Office/Admin
- **Two-Way Sync:**
  - If event was auto-created from material/labor order:
    - Show warning: "This event is linked to [Material Order #123]. Changes will update the order."
    - Update `delivery_date` or production dates in linked order
    - **Restriction:** Only specific roles can edit order-linked events (configurable permission)

#### Quick Actions (Right-click or Swipe)
- **Reschedule:** Drag-and-drop to new time slot
- **Cancel:** Mark as cancelled (keep in history)
- **Complete:** Mark as completed
- **Delete:** Soft delete (admin only)

### 3. Automatic Event Creation

#### From Material Orders
- **Trigger:** When `delivery_date` is set on material order
- **Event Created:**
  - Type: Production - Materials
  - Title: "Material Delivery - [Lead Name]"
  - Date: `delivery_date`
  - All Day: Yes
  - Assigned Users: Assigned from order (if any)
  - `material_order_id`: Link to order
  - Description: "Order #[order_number] - [material count] items"

#### From Labor Orders
- **Trigger:** When production start/end dates are set on labor order
- **Event Created:**
  - Type: Production - Labor
  - Title: "Installation - [Lead Name]"
  - Date: Start date (or span multiple days if multi-day)
  - All Day: Yes
  - Assigned Users: Crew from work order
  - `labor_order_id`: Link to order
  - Description: "Work Order #[order_number] - [crew name]"
  - `related_event_id`: If there's a material delivery for same lead, link them

#### Link Material & Labor Events
- When creating labor event, check if material event exists for same lead
- Set `related_event_id` to link them
- Show connection in event details: "Related: Material Delivery on Dec 10"

### 4. Multi-User Assignment

#### Assign Users to Events
- **UI:** Multi-select dropdown with user search
- **Behavior:**
  - Users can assign themselves
  - Users can assign others to events they create
  - Admin/Office can assign anyone
- **Display:** Show user avatars on event blocks

#### "My Schedule" vs "All Team"
- **Toggle Button:** Top of calendar
  - "My Schedule" → Show only events where current user is assigned
  - "All Team" → Show all events for company
  - "User: [Name]" → Show specific user's schedule (for appointment setters)

### 5. Notifications

#### Event Notifications (Add to Notification System)
- **New Event Types in Preferences:**
  - `production_scheduled` (Email/Push/SMS)
  - `event_assigned` (Email/Push)
  - `event_reminder` (Push/SMS) - X hours before
  - `event_rescheduled` (Email/Push)
  - `event_cancelled` (Email/Push/SMS)

#### Trigger Points:
- **Production Scheduled:** When material/labor event auto-created
- **Event Assigned:** When user assigned to event
- **Event Reminder:** 24hrs before, 1hr before (configurable)
- **Event Rescheduled:** When event date/time changed
- **Event Cancelled:** When event marked cancelled

### 6. Recurring Events (If Easy to Implement)

#### Recurrence Options
- **Patterns:**
  - Daily (every X days)
  - Weekly (every X weeks on specific days)
  - Monthly (specific date or day-of-week)
  - Yearly
- **End Condition:**
  - Never (until manually stopped)
  - After X occurrences
  - On specific date
- **Storage:** 
  - `recurrence_pattern` JSONB field
  - Example: `{"frequency": "weekly", "interval": 1, "days": ["monday", "wednesday"], "end_date": "2025-12-31"}`

#### UI
- **Checkbox:** "Repeat this event"
- **Expand:** Show recurrence options
- **Edit:** 
  - "Edit this event only" vs "Edit all future events"
  - "Delete this event only" vs "Delete series"

---

## 📱 Integration Points

### 1. Lead Detail Page

#### "Schedule Appointment" Button
- **Location:** Lead header (next to Edit/Delete) or in Appointments section
- **Action:** Opens quick-add modal with lead pre-filled
- **Context:** Auto-selects "Consultation" type for new leads

#### Appointments Section (Existing Checklist Area?)
- **Show:** Upcoming events for this lead
- **Format:** List with date, time, type, assigned users
- **Actions:** View, Edit, Cancel

### 2. Material Orders

#### Delivery Date Field
- **On Save:** If `delivery_date` changed → update/create calendar event
- **Show Link:** "View on Calendar" button next to delivery date
- **Sync:** Two-way sync with restriction check

### 3. Labor Orders

#### Production Dates
- **On Save:** If production dates changed → update/create calendar event
- **Show Link:** "View on Calendar" button
- **Sync:** Two-way sync with restriction check

### 4. Navigation

#### Calendar Menu Item
- **Location:** Main sidebar under "Production"
- **Icon:** Calendar icon
- **Route:** `/admin/calendar`
- **Badge:** Show count of today's events (optional)

---

## 🗄️ Database Schema

### `calendar_events` Table

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('consultation', 'production_materials', 'production_labor', 'adjuster_meeting', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  assigned_users UUID[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
  material_order_id UUID REFERENCES material_orders(id) ON DELETE SET NULL,
  labor_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_calendar_events_company_id ON calendar_events(company_id);
CREATE INDEX idx_calendar_events_lead_id ON calendar_events(lead_id);
CREATE INDEX idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_assigned_users ON calendar_events USING GIN(assigned_users);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_calendar_events_material_order_id ON calendar_events(material_order_id);
CREATE INDEX idx_calendar_events_labor_order_id ON calendar_events(labor_order_id);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's events"
  ON calendar_events FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create events with proper permissions"
  ON calendar_events FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      -- Anyone can create consultation, adjuster, other
      event_type IN ('consultation', 'adjuster_meeting', 'other')
      OR
      -- Only production manager/office/admin can create production events
      (
        event_type IN ('production_materials', 'production_labor')
        AND EXISTS (
          SELECT 1 FROM user_permissions up
          JOIN users u ON u.id = up.user_id
          WHERE u.id = auth.uid()
          AND (
            up.can_manage_production = true
            OR u.role IN ('office', 'admin')
          )
        )
      )
    )
  );

CREATE POLICY "Users can update their own events or with proper permissions"
  ON calendar_events FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'office')
      )
    )
  );

CREATE POLICY "Only admin/office can delete events"
  ON calendar_events FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'office')
    )
  );
```

---

## 🔑 Permissions

### New Permissions to Add

Add to `user_permissions` table:
- `can_view_calendar` (boolean) - View calendar
- `can_create_consultations` (boolean) - Create consultation events
- `can_create_production_events` (boolean) - Create production materials/labor events
- `can_edit_all_events` (boolean) - Edit any event (not just own)
- `can_manage_recurring_events` (boolean) - Create/edit recurring events

### Role Defaults

```typescript
DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    can_view_calendar: true,
    can_create_consultations: true,
    can_create_production_events: true,
    can_edit_all_events: true,
    can_manage_recurring_events: true,
  },
  office: {
    can_view_calendar: true,
    can_create_consultations: true,
    can_create_production_events: true,
    can_edit_all_events: true,
    can_manage_recurring_events: true,
  },
  production_manager: {
    can_view_calendar: true,
    can_create_consultations: true,
    can_create_production_events: true,
    can_edit_all_events: false,
    can_manage_recurring_events: false,
  },
  sales: {
    can_view_calendar: true,
    can_create_consultations: true,
    can_create_production_events: false,
    can_edit_all_events: false,
    can_manage_recurring_events: false,
  },
  user: {
    can_view_calendar: true,
    can_create_consultations: true,
    can_create_production_events: false,
    can_edit_all_events: false,
    can_manage_recurring_events: false,
  },
}
```

---

## 📦 Implementation Plan

### Phase 1: Database & API (8-10 hours)

#### 1.1 Database Migration
- [ ] Create `calendar_events` table
- [ ] Add indexes
- [ ] Set up RLS policies
- [ ] Add new permissions to `user_permissions`
- [ ] Update role templates with calendar permissions

#### 1.2 TypeScript Types
- [ ] Generate types from Supabase schema
- [ ] Create `EventType`, `EventStatus` enums
- [ ] Define `CalendarEvent`, `CalendarEventInsert`, `CalendarEventUpdate` types
- [ ] Define `EventFilters`, `RecurrencePattern` types

#### 1.3 API Layer (`lib/api/calendar.ts`)
- [ ] `getEvents(companyId, filters)` - Fetch events with filters
- [ ] `getEventById(eventId)` - Get single event with relations
- [ ] `getEventsByLead(leadId)` - Get all events for a lead
- [ ] `getEventsByUser(userId, dateRange)` - Get user's schedule
- [ ] `createEvent(event)` - Create new event
- [ ] `updateEvent(eventId, updates)` - Update event
- [ ] `deleteEvent(eventId)` - Soft delete event
- [ ] `cancelEvent(eventId)` - Mark as cancelled
- [ ] `completeEvent(eventId)` - Mark as completed
- [ ] `rescheduleEvent(eventId, newDate, newTime)` - Reschedule
- [ ] `checkConflicts(userId, date, time)` - Check for overlaps
- [ ] `createEventFromMaterialOrder(orderId)` - Auto-create from order
- [ ] `createEventFromLaborOrder(orderId)` - Auto-create from order
- [ ] `linkRelatedEvents(deliveryEventId, laborEventId)` - Link delivery to install

#### 1.4 React Query Hooks (`lib/hooks/use-calendar.ts`)
- [ ] `useEvents(filters)` - Get filtered events
- [ ] `useEventsByLead(leadId)` - Get lead events
- [ ] `useMySchedule(dateRange)` - Get current user's schedule
- [ ] `useEvent(eventId)` - Get single event
- [ ] `useCreateEvent()` - Create mutation
- [ ] `useUpdateEvent()` - Update mutation
- [ ] `useDeleteEvent()` - Delete mutation
- [ ] `useCancelEvent()` - Cancel mutation
- [ ] `useRescheduleEvent()` - Reschedule mutation

---

### Phase 2: Calendar Views (12-15 hours)

#### 2.1 Day View Component
- [ ] `DayView.tsx` - Main day view container
- [ ] Time slot grid (7am-7pm, scrollable)
- [ ] Event blocks with color coding
- [ ] Click empty slot to create event
- [ ] Click event to view details
- [ ] Mobile-optimized touch interactions
- [ ] Overbooking visual indicators

#### 2.2 Week View Component
- [ ] `WeekView.tsx` - Week grid container
- [ ] 7-day columns
- [ ] Event count badges per day
- [ ] Click day to expand event list
- [ ] Mobile horizontal scroll

#### 2.3 Month View Component
- [ ] `MonthView.tsx` - Month grid container
- [ ] Calendar grid layout
- [ ] Event dots/counts per day (color-coded)
- [ ] Click day to expand event list
- [ ] Mobile-optimized grid

#### 2.4 List View Component
- [ ] `ListView.tsx` - Chronological event list
- [ ] Group by date headers
- [ ] Event cards with full details
- [ ] Infinite scroll or pagination
- [ ] Mobile swipe actions

#### 2.5 View Switcher
- [ ] `CalendarViewTabs.tsx` - Tab navigation
- [ ] State management for active view
- [ ] Mobile dropdown vs desktop tabs
- [ ] Persist view preference

---

### Phase 3: Event Management (8-10 hours)

#### 3.1 Event Modals
- [ ] `EventQuickAddModal.tsx` - Quick add form
- [ ] `EventDetailModal.tsx` - Full event details
- [ ] `EventEditModal.tsx` - Edit form
- [ ] `EventConfirmDeleteDialog.tsx` - Delete confirmation

#### 3.2 Event Forms
- [ ] Event type selector with color previews
- [ ] Date/time pickers (react-datepicker or similar)
- [ ] All-day toggle
- [ ] Duration presets
- [ ] Multi-user select with search
- [ ] Address autocomplete for location
- [ ] Rich text editor for description (optional)
- [ ] Permission checks before submit

#### 3.3 Event Cards/Blocks
- [ ] `EventBlock.tsx` - Calendar event visual
- [ ] `EventCard.tsx` - List view event
- [ ] Color coding by type
- [ ] User avatars
- [ ] Status badges
- [ ] Quick action buttons (edit, cancel, complete)

---

### Phase 4: Filtering & Search (4-6 hours)

#### 4.1 Filter Components
- [ ] `CalendarFilters.tsx` - Filter panel/drawer
- [ ] User filter (My Schedule / All Team / Specific User)
- [ ] Event type filter (checkboxes)
- [ ] Status filter
- [ ] Date range picker
- [ ] Clear filters button

#### 4.2 Search
- [ ] `CalendarSearch.tsx` - Search input
- [ ] Debounced search (300ms)
- [ ] Search results highlighting
- [ ] Navigate to event from search

#### 4.3 Color Legend
- [ ] `ColorLegend.tsx` - Event type color guide
- [ ] Collapsible panel
- [ ] Show/hide toggle

---

### Phase 5: Auto-Creation & Sync (6-8 hours)

#### 5.1 Material Order Integration
- [ ] Update `createMaterialOrder()` to create calendar event
- [ ] Update `updateMaterialOrder()` to sync event if `delivery_date` changed
- [ ] "View on Calendar" link in order UI
- [ ] Sync restrictions (permission check)

#### 5.2 Labor Order Integration
- [ ] Update `createWorkOrder()` to create calendar event
- [ ] Update `updateWorkOrder()` to sync event if dates changed
- [ ] Link to related material delivery event
- [ ] "View on Calendar" link in order UI

#### 5.3 Two-Way Sync
- [ ] When editing calendar event linked to order:
  - Show warning message
  - Update order `delivery_date` or production dates
  - Permission check (only Production Manager/Office/Admin)
- [ ] Handle edge cases (order deleted, event deleted)

---

### Phase 6: Lead Integration (2-3 hours)

#### 6.1 Lead Detail Page
- [ ] Add "Schedule Appointment" button in header
- [ ] Opens quick-add modal with lead pre-filled
- [ ] Show upcoming events section
- [ ] Link to view full calendar filtered by lead

#### 6.2 Appointments Display
- [ ] `LeadAppointments.tsx` - Component for lead page
- [ ] List upcoming events
- [ ] Past events (completed/cancelled)
- [ ] Quick actions (reschedule, cancel)

---

### Phase 7: Notifications (3-4 hours)

#### 7.1 Database
- [ ] Add notification types to system
- [ ] Add to user preferences schema

#### 7.2 Notification Triggers
- [ ] Send notification when production event auto-created
- [ ] Send notification when user assigned to event
- [ ] Send reminder notifications (cron job or edge function)
- [ ] Send notification when event rescheduled/cancelled

#### 7.3 UI
- [ ] Add calendar notifications to preferences page
- [ ] Group under "Calendar" category

---

### Phase 8: Recurring Events (Optional - 4-6 hours)

#### 8.1 Recurrence Logic
- [ ] Create `generateRecurringEvents()` function
- [ ] Parse recurrence pattern
- [ ] Generate event instances
- [ ] Handle end conditions

#### 8.2 UI
- [ ] Recurrence options in event form
- [ ] "Edit series" vs "Edit this event" dialog
- [ ] Show recurrence indicator on events

---

### Phase 9: Calendar Page Layout (2-3 hours)

#### 9.1 Main Calendar Page
- [ ] `/admin/calendar/page.tsx` - Server component
- [ ] Layout with header, view switcher, filters, calendar
- [ ] Mobile-responsive design
- [ ] Permission checks (redirect if no access)

#### 9.2 Navigation
- [ ] Add "Calendar" to sidebar (under Production)
- [ ] Calendar icon
- [ ] Badge with today's event count (optional)

---

### Phase 10: Testing & Polish (4-6 hours)

#### 10.1 Testing
- [ ] Test all event CRUD operations
- [ ] Test auto-creation from orders
- [ ] Test two-way sync
- [ ] Test permissions (different roles)
- [ ] Test filtering and search
- [ ] Test mobile responsiveness
- [ ] Test notifications
- [ ] Test recurring events (if implemented)

#### 10.2 Polish
- [ ] Loading states
- [ ] Error states
- [ ] Empty states ("No events scheduled")
- [ ] Success toasts
- [ ] Smooth animations
- [ ] Keyboard shortcuts (arrow keys to navigate)
- [ ] Accessibility (ARIA labels, keyboard nav)

#### 10.3 Documentation
- [ ] Update PRODUCT_ROADMAP.md
- [ ] Create user guide for calendar
- [ ] Add calendar to testing checklist

---

## 🎨 UI/UX Design Notes

### Color Scheme
- **Consultation:** `bg-blue-500` / `border-blue-500`
- **Production - Materials:** `bg-green-500` / `border-green-500`
- **Production - Labor:** `bg-orange-500` / `border-orange-500`
- **Adjuster Meeting:** `bg-red-500` / `border-red-500`
- **Other:** `bg-purple-500` / `border-purple-500`

### Event Block Styling
```tsx
// Example event block
<div className={cn(
  "rounded-lg p-2 border-l-4 cursor-pointer",
  "hover:shadow-md transition-shadow",
  {
    "bg-blue-50 border-blue-500": type === 'consultation',
    "bg-green-50 border-green-500": type === 'production_materials',
    "bg-orange-50 border-orange-500": type === 'production_labor',
    "bg-red-50 border-red-500": type === 'adjuster_meeting',
    "bg-purple-50 border-purple-500": type === 'other',
  }
)}>
  <div className="font-medium text-sm">{title}</div>
  <div className="text-xs text-gray-600">{time}</div>
  <div className="flex items-center gap-1 mt-1">
    {assignedUsers.map(user => (
      <Avatar key={user.id} size="xs" name={user.full_name} />
    ))}
  </div>
</div>
```

### Mobile Optimizations
- **Touch targets:** Minimum 44px height
- **Swipe gestures:** Swipe event card for quick actions
- **Pull to refresh:** Refresh calendar data
- **Bottom sheet modals:** For event details on mobile
- **Sticky headers:** Keep date headers visible while scrolling

---

## 🔮 Future Enhancements

### Phase 2 Features (Post-Launch)
- [ ] Color code by installer/crew (not just event type)
- [ ] Drag-and-drop rescheduling
- [ ] Crew/sub availability tracking
- [ ] Calendar export (iCal, Google Calendar sync)
- [ ] Print calendar view
- [ ] SMS reminders (Twilio integration)
- [ ] Route optimization for field appointments
- [ ] Check-in/check-out for appointments (GPS)
- [ ] Customer portal (customers see their appointments)
- [ ] Appointment confirmations (customer replies to confirm)

---

## ✅ Definition of Done

Calendar System is complete when:
- [ ] All 5 event types can be created
- [ ] All 4 views (Day/Week/Month/List) work on desktop and mobile
- [ ] Events auto-create from material and labor orders
- [ ] Two-way sync works with proper permissions
- [ ] Multi-user assignment works
- [ ] Filtering by user/type/status works
- [ ] Search works across events
- [ ] Color coding and legend display correctly
- [ ] Notifications trigger for production events
- [ ] Lead detail page has "Schedule Appointment" button
- [ ] Calendar shows in navigation
- [ ] Permissions enforced (production events restricted)
- [ ] Mobile-responsive and touch-friendly
- [ ] All CRUD operations tested
- [ ] Documentation updated

---

**Ready to start building? Let's tackle Phase 1 first!** 🚀
