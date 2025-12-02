# Phase 2: Checklist System Enhancements

**Status**: Future Phase  
**Dependencies**: Phase 1 Lead Management (✅ Complete)  
**Priority**: Medium - Implement based on user feedback

---

## Overview

The core checklist system is complete with:
- ✅ Multi-stage workflow (New → Quote → Production → Invoiced → Closed)
- ✅ Auto-generated checklist items per stage
- ✅ Completion tracking with timestamps and user attribution
- ✅ **Automatic activity logging** when items are checked/unchecked
- ✅ **Stage auto-progression** when all items in a stage are complete

This document outlines future enhancements to make the checklist system even more powerful.

---

## 1. Custom Checklist Items

**Value**: Allow companies to customize workflows for their specific processes

### Features
- Add custom checklist items to any stage
- Reorder items (drag & drop)
- Mark items as required vs optional
- Save custom templates per service type (e.g., "Commercial Roof Replacement" template)

### Implementation
```sql
-- Add to lead_checklist_items table
ALTER TABLE lead_checklist_items 
ADD COLUMN is_custom BOOLEAN DEFAULT false,
ADD COLUMN is_required BOOLEAN DEFAULT true,
ADD COLUMN template_id UUID REFERENCES checklist_templates(id);

-- New table for templates
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  service_type TEXT,
  items JSONB NOT NULL
);
```

### UI Components Needed
- `AddChecklistItemDialog` - Modal to add custom items
- `ChecklistItemSorter` - Drag & drop reordering
- `ChecklistTemplateManager` - Manage and apply templates

### Estimated Time
- Backend: 2-3 hours
- Frontend: 4-5 hours
- Testing: 1 hour
- **Total: ~8 hours**

---

## 2. Notifications & Alerts

**Value**: Keep team informed of important milestones and overdue tasks

### Features
- Email notifications when:
  - Critical items are completed (e.g., "Deposit Collected")
  - Items are overdue
  - All items in a stage are complete
- SMS notifications for urgent updates
- In-app notification center with unread count
- Configurable notification preferences per user

### Implementation

#### A. Email Notifications (Resend)
```typescript
// lib/email/checklist-notifications.ts
export async function sendChecklistCompletionEmail({
  to: string,
  leadName: string,
  itemLabel: string,
  completedBy: string,
}) {
  await resend.emails.send({
    from: 'notifications@ketterly.com',
    to,
    subject: `✅ ${itemLabel} completed for ${leadName}`,
    html: `<p>${completedBy} completed "${itemLabel}"</p>`
  })
}
```

#### B. In-App Notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### C. Notification Preferences
```sql
CREATE TABLE user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  email_checklist_complete BOOLEAN DEFAULT true,
  email_stage_advance BOOLEAN DEFAULT true,
  sms_urgent_items BOOLEAN DEFAULT false,
  in_app_all BOOLEAN DEFAULT true
);
```

### UI Components Needed
- `NotificationBell` - Header component with dropdown
- `NotificationPreferences` - Settings page
- `NotificationItem` - Individual notification display

### Estimated Time
- Email setup (Resend): 2 hours
- SMS setup (Twilio): 2 hours
- In-app notifications: 6 hours
- Preference management: 3 hours
- **Total: ~13 hours**

---

## 3. Due Dates & Reminders

**Value**: Ensure tasks don't fall through the cracks

### Features
- Set due dates on checklist items
- Visual indicators for:
  - ✅ Completed on time
  - ⚠️ Due soon (within 24 hours)
  - 🔴 Overdue
- Daily cron job to send reminder emails/notifications
- Auto-calculate suggested due dates based on SLAs

### Implementation

```sql
-- Add to lead_checklist_items
ALTER TABLE lead_checklist_items
ADD COLUMN due_date DATE,
ADD COLUMN reminder_sent_at TIMESTAMPTZ;

-- Supabase Edge Function (cron job)
CREATE FUNCTION send_due_date_reminders()
RETURNS void AS $$
  -- Find items due in next 24 hours
  -- Send reminders to assigned users
  -- Mark reminder_sent_at
$$ LANGUAGE plpgsql;
```

### UI Components Needed
- `ChecklistItemDueDatePicker` - Date picker for items
- `OverdueItemsBanner` - Dashboard widget showing overdue items
- Due date badges in checklist display

### Estimated Time
- Backend: 3 hours
- Cron job setup: 2 hours
- Frontend: 4 hours
- **Total: ~9 hours**

---

## 4. Conditional Logic & Dependencies

**Value**: Enforce proper workflow order and show/hide items based on context

### Features
- **Dependencies**: "Materials Ordered" only shows after "Deposit Collected" is checked
- **Conditional Visibility**: Hide certain items based on service type or custom fields
- **Auto-Complete Rules**: When X is checked, auto-check Y
- **Blocking Items**: Can't move to next stage until specific items are done

### Implementation

```sql
-- Add to lead_checklist_items
ALTER TABLE lead_checklist_items
ADD COLUMN depends_on_item_id UUID REFERENCES lead_checklist_items(id),
ADD COLUMN visibility_condition JSONB,
ADD COLUMN auto_complete_items UUID[];

-- Example visibility condition
{
  "field": "service_type",
  "operator": "equals",
  "value": "replacement"
}
```

### Logic Engine
```typescript
// lib/checklist/rules-engine.ts
export function evaluateVisibility(
  item: ChecklistItem,
  lead: Lead,
  allItems: ChecklistItem[]
): boolean {
  // Check dependencies
  if (item.depends_on_item_id) {
    const dependency = allItems.find(i => i.id === item.depends_on_item_id)
    if (!dependency?.is_completed) return false
  }
  
  // Check visibility conditions
  if (item.visibility_condition) {
    return evaluateCondition(item.visibility_condition, lead)
  }
  
  return true
}
```

### UI Components Needed
- `DependencySelector` - Choose which items depend on this one
- `ConditionBuilder` - Visual rule builder
- Grayed-out items with "Requires: X" tooltip

### Estimated Time
- Backend: 4 hours
- Rules engine: 5 hours
- Frontend: 6 hours
- **Total: ~15 hours**

---

## 5. Analytics & Reporting

**Value**: Identify bottlenecks and optimize workflow

### Features
- **Stage Completion Time**: Average time spent in each stage
- **Item Completion Rate**: Which items get stuck most often
- **Team Performance**: Who completes items fastest
- **Bottleneck Detection**: Automatically flag stages taking too long
- **Custom Reports**: Export data to CSV/Excel

### Metrics to Track

```sql
-- Create analytics views
CREATE VIEW checklist_completion_metrics AS
SELECT 
  stage,
  item_key,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_seconds,
  COUNT(*) as total_completions,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as incomplete_count
FROM lead_checklist_items
GROUP BY stage, item_key;

CREATE VIEW team_performance_metrics AS
SELECT 
  completed_by,
  COUNT(*) as items_completed,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_time_to_complete
FROM lead_checklist_items
WHERE is_completed = true
GROUP BY completed_by;
```

### Visualizations
- Bar chart: Average time per stage
- Pie chart: Completion rate by stage
- Line chart: Items completed over time
- Table: Top performers

### UI Components Needed
- `ChecklistAnalyticsDashboard` - Main analytics page
- `StageTimelineChart` - Recharts visualization
- `TeamPerformanceTable` - Sortable table
- `ExportButton` - CSV export functionality

### Estimated Time
- SQL views & queries: 3 hours
- Chart components: 5 hours
- Export functionality: 2 hours
- Dashboard layout: 3 hours
- **Total: ~13 hours**

---

## 6. Mobile Optimization

**Value**: Crew members can check off items from job site

### Features
- Responsive checklist UI for mobile
- Offline support (check items without internet, sync later)
- Camera integration for photo evidence
- GPS location stamp on completions

### Implementation
- Progressive Web App (PWA) setup
- Service Worker for offline functionality
- IndexedDB for local storage
- Sync queue when connection restored

### Estimated Time
- PWA setup: 4 hours
- Offline sync: 6 hours
- Mobile UI optimization: 5 hours
- Photo integration: 3 hours
- **Total: ~18 hours**

---

## Implementation Priority

Based on user feedback and business value:

### High Priority (Phase 2A)
1. **Due Dates & Reminders** (9 hours) - Prevents missed deadlines
2. **Email Notifications** (5 hours, subset of #2) - Keep team informed

### Medium Priority (Phase 2B)
3. **Custom Checklist Items** (8 hours) - Allow workflow customization
4. **Analytics Dashboard** (13 hours) - Business intelligence

### Low Priority (Phase 2C)
5. **Conditional Logic** (15 hours) - Nice-to-have, complex
6. **Mobile PWA** (18 hours) - Only if field team needs it

---

## Total Estimated Time

- **High Priority (2A)**: ~14 hours
- **Medium Priority (2B)**: ~21 hours
- **Low Priority (2C)**: ~33 hours
- **Grand Total**: ~68 hours (1.5-2 weeks for one developer)

---

## Notes

- Start with user feedback: Which features do users actually want?
- Consider building custom items + due dates first (universal needs)
- Analytics can wait until there's real data to analyze
- Conditional logic is powerful but complex - may be overkill for v1

---

**Last Updated**: November 29, 2024  
**Next Review**: After 30 days of user feedback on Phase 1
