# Phase 1: Lead Management System

**Goal**: Build a complete lead management system with list views, detail pages, forms, pipeline progress visualization, and activity tracking.

**Duration**: ~2-3 weeks  
**Prerequisites**: Phase 0 complete (database, types, API layer, auth, admin layout)

---

## Overview

Phase 1 focuses exclusively on creating a production-ready lead management system. By the end of this phase, users will be able to:

- View all leads in a searchable, filterable data table
- Create new leads with validation
- Edit existing lead information
- View detailed lead profiles
- Track lead pipeline status with visual progress indicator
- Log activities (notes, calls, emails, meetings)
- Assign leads to team members
- Filter and search leads by multiple criteria

All features are **mobile-first**, **multi-tenant aware**, and follow the established design system.

---

## Step 1: Lead List View with Data Table

**Files to Create/Modify:**
- `app/(admin)/admin/leads/page.tsx` - Main leads page (Server Component)
- `components/admin/leads/leads-table.tsx` - Interactive data table (Client Component)
- `components/admin/leads/leads-filters.tsx` - Filter controls (Client Component)
- `lib/constants/leads.ts` - Lead-specific constants

**What to Build:**

### 1.1 Lead Constants File
Create centralized constants for lead-related values:
```typescript
// lib/constants/leads.ts
export const LEAD_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  QUOTE_SENT: 'quote_sent',
  FOLLOW_UP: 'follow_up',
  WON: 'won',
  INVOICED: 'invoiced',
  CLOSED: 'closed',
  LOST: 'lost',
  ARCHIVED: 'archived',
} as const

export const LEAD_STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quote_sent: 'Quote Sent',
  follow_up: 'Follow Up',
  won: 'Won',
  invoiced: 'Invoiced',
  closed: 'Closed',
  lost: 'Lost',
  archived: 'Archived',
}

export const LEAD_STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  quote_sent: 'bg-yellow-100 text-yellow-700',
  follow_up: 'bg-orange-100 text-orange-700',
  won: 'bg-emerald-100 text-emerald-700',
  invoiced: 'bg-indigo-100 text-indigo-700',
  closed: 'bg-teal-100 text-teal-700',
  lost: 'bg-gray-100 text-gray-700',
  archived: 'bg-slate-100 text-slate-700',
}

export const LEAD_SOURCES = {
  WEBSITE: 'website',
  REFERRAL: 'referral',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  HOMEADVISOR: 'homeadvisor',
  ANGI: 'angi',
  DIRECT: 'direct',
  OTHER: 'other',
}

export const LEAD_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const LEAD_PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}
```

### 1.2 Server Component Page
Fetch initial data server-side, render client component:
```typescript
// app/(admin)/admin/leads/page.tsx
import { createClient } from '@/lib/supabase/server'
import { LeadsTable } from '@/components/admin/leads/leads-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function LeadsPage() {
  const supabase = createClient()
  
  // Get current user's company
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user!.id)
    .single()

  // Fetch leads with user info
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_to_user:users!leads_assigned_to_fkey(id, full_name, email)
    `)
    .eq('company_id', userData!.company_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">Manage and track your sales leads</p>
        </div>
        <Link href="/admin/leads/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </Link>
      </div>

      <LeadsTable initialData={leads || []} />
    </div>
  )
}
```

### 1.3 Interactive Data Table
Build client component with TanStack Table:
- Sortable columns
- Search functionality
- Status/source/priority filters
- Pagination
- Mobile-responsive (card view on mobile, table on desktop)
- Row actions (view, edit, delete)

**Key Features:**
- Use `@tanstack/react-table` for table logic
- Search across name, email, phone, address
- Filter dropdowns for status, source, priority
- Highlight urgent leads
- Show assigned user avatar/name
- Click row to navigate to detail page
- Mobile: Stack data in cards instead of table

### 1.4 Filter Controls Component
Separate component for filters to keep table clean:
- Search input (debounced)
- Status multi-select dropdown
- Source dropdown
- Priority dropdown
- Date range picker (created_at)
- Clear all filters button

**Success Criteria:**
✅ Table displays all leads from current company  
✅ Search filters across multiple fields instantly  
✅ Filters work independently and together  
✅ Mobile view shows cards instead of table  
✅ Pagination works correctly  
✅ Clicking row navigates to detail page  

---

## Step 2: Lead Detail Page

**Files to Create/Modify:**
- `app/(admin)/admin/leads/[id]/page.tsx` - Lead detail page
- `components/admin/leads/lead-detail-header.tsx` - Header with actions
- `components/admin/leads/lead-info-card.tsx` - Lead information display
- `components/admin/leads/lead-timeline.tsx` - Activity timeline

**What to Build:**

### 2.1 Lead Detail Page (Server Component)
Fetch single lead with all relations:
```typescript
const { data: lead } = await supabase
  .from('leads')
  .select(`
    *,
    assigned_to_user:users!leads_assigned_to_fkey(id, full_name, email),
    activities(
      *,
      created_by_user:users!activities_created_by_fkey(id, full_name)
    )
  `)
  .eq('id', params.id)
  .eq('company_id', userData!.company_id)
  .is('deleted_at', null)
  .single()
```

### 2.2 Lead Detail Layout
Create comprehensive detail view:
- **Header Section**: Name, status badge, priority badge, action buttons (Edit, Delete, Convert to Quote)
- **Info Cards**: Contact info, service details, address, source
- **Activity Timeline**: All activities in chronological order
- **Quick Stats**: Days in pipeline, last contact date, response time
- **Related Records**: Link to quotes/projects if they exist

### 2.3 Mobile-Responsive Design
- Stack cards vertically on mobile
- Sticky header with actions
- Collapsible sections
- Touch-friendly action buttons

**Success Criteria:**
✅ Displays all lead information  
✅ Shows activity timeline  
✅ Action buttons work (edit navigates to form)  
✅ Mobile layout is touch-friendly  
✅ 404 page if lead not found or wrong company  

---

## Step 3: Lead Creation & Edit Forms

**Files to Create/Modify:**
- `app/(admin)/admin/leads/new/page.tsx` - New lead page
- `app/(admin)/admin/leads/[id]/edit/page.tsx` - Edit lead page
- `components/admin/leads/lead-form.tsx` - Reusable form component
- `lib/validation/schemas.ts` - Update with full lead schema

**What to Build:**

### 3.1 Enhanced Zod Schema
Expand existing schema with all validations:
```typescript
export const leadFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  address: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().length(2, 'State must be 2 letters'),
  zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  source: z.nativeEnum(LeadSource),
  service_type: z.nativeEnum(ServiceType),
  priority: z.nativeEnum(LeadPriority).default('medium'),
  status: z.nativeEnum(LeadStatus).default('new'),
  assigned_to: z.string().uuid().optional(),
  estimated_value: z.number().positive().optional(),
  notes: z.string().optional(),
})
```

### 3.2 Lead Form Component
Create comprehensive form with React Hook Form:
- **Section 1**: Contact Information (name, email, phone)
- **Section 2**: Address (address, city, state, zip) - could add Google Places autocomplete later
- **Section 3**: Lead Details (source, service type, priority, status)
- **Section 4**: Assignment (assign to user dropdown)
- **Section 5**: Additional Info (estimated value, notes)

**Form Features:**
- Real-time validation with Zod
- Error messages under each field
- Loading state during submission
- Success/error toast notifications
- Cancel button with confirmation if form is dirty
- Mobile-optimized inputs (tel type for phone, etc.)

### 3.3 New Lead Page
Wrapper for form in creation mode:
- Pre-fill status as 'new'
- Pre-fill priority as 'medium'
- On success: redirect to lead detail page

### 3.4 Edit Lead Page
Wrapper for form in edit mode:
- Fetch existing lead data
- Pre-populate form
- On success: redirect back to detail page

**Success Criteria:**
✅ Form validates all fields correctly  
✅ Error messages display properly  
✅ Creation saves to database  
✅ Edit updates existing lead  
✅ Mobile keyboard types are correct (tel, email)  
✅ Toast notifications appear  
✅ Redirects work after save  

---

## Step 4: Status Management & Pipeline Visualization

**Files to Create/Modify:**
- `components/admin/leads/status-dropdown.tsx` - Inline status changer for table
- `components/admin/leads/pipeline-progress.tsx` - Visual progress bar for detail page
- `lib/hooks/use-leads.ts` - Add `useUpdateLeadStatus` mutation

**What to Build:**

### 4.1 Inline Status Dropdown (for Table)
Add status dropdown directly in table rows:
- Dropdown shows all 7 statuses with colors
- Click to change status instantly
- Optimistic UI update
- Toast notification on success/error
- Mobile-friendly touch targets

```typescript
// Simple, clean implementation
<Select value={lead.status} onValueChange={(status) => updateStatus(lead.id, status)}>
  <SelectTrigger className="w-full">
    <StatusBadge status={lead.status} />
  </SelectTrigger>
  <SelectContent>
    {/* Map through all statuses */}
  </SelectContent>
</Select>
```

### 4.2 Pipeline Progress Bar (for Detail Page)
Visual status indicator on lead detail page:
- Horizontal progress bar showing 7 stages
- Current stage highlighted
- Completed stages in green
- Future stages in gray
- Click any stage to jump to it
- Mobile: Responsive sizing, touch-friendly

**Visual Example:**
```
[●] New → [●] Contacted → [●] Qualified → [○] Quote Sent → [○] Follow Up → [○] Won → [○] Invoiced → [○] Closed
```

### 4.3 Status Update Mutation
Add mutation hook for status changes:
```typescript
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ leadId, status }) => updateLead(companyId, leadId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
      toast.success('Lead status updated')
    }
  })
}
```

### 4.4 Auto-Generate Activity
When status changes, auto-create activity:
- "Status changed from [Old] to [New]"
- Include user who made the change
- Timestamp

**Success Criteria:**
✅ Inline dropdown works in table  
✅ Status updates instantly with optimistic UI  
✅ Progress bar shows current stage visually  
✅ Can click progress bar to change status  
✅ Activity auto-generated on status change  
✅ Mobile-friendly on all devices  

---

## Step 5: Activity Tracking System

**Files to Create/Modify:**
- `components/admin/leads/activity-timeline.tsx` - Timeline component
- `components/admin/leads/add-activity-form.tsx` - Quick add form
- `components/admin/leads/activity-item.tsx` - Single activity display
- `lib/api/activities.ts` - Activity CRUD functions
- `lib/hooks/use-activities.ts` - Activity React Query hooks

**What to Build:**

### 5.1 Activity API Functions
Create full CRUD for activities:
```typescript
// lib/api/activities.ts
export async function getActivities(
  companyId: string,
  leadId: string
): Promise<ApiResponse<Activity[]>>

export async function createActivity(
  companyId: string,
  activity: ActivityInsert
): Promise<ApiResponse<Activity>>

// Activity types: note, call, email, meeting, status_change
```

### 5.2 Activity Hooks
React Query hooks for activities:
```typescript
// lib/hooks/use-activities.ts
export function useActivities(leadId: string)
export function useCreateActivity()
```

### 5.3 Activity Timeline Component
Display all activities in chronological order:
- Group by date
- Show activity type icon
- Display user who created it
- Show timestamp
- Format activity content
- Auto-scroll to latest

### 5.4 Quick Add Activity Form
Small form at top of timeline:
- Activity type dropdown (note, call, email, meeting)
- Content textarea
- Submit button
- Auto-focus on mount
- Clear after submit

### 5.5 Auto-Generated Activities
Create activities automatically for:
- Lead status changes
- Lead assignment changes
- Lead creation
- Lead updates (track what changed)

### 5.6 Activity Types
**Note**: Free-form text note  
**Call**: Log phone call with outcome  
**Email**: Log email sent/received  
**Meeting**: Log in-person or video meeting  
**Status Change**: Auto-generated when status updates  

**Success Criteria:**
✅ Timeline displays all activities  
✅ Can add new activities  
✅ Auto-generated activities work  
✅ Activities update in real-time  
✅ Mobile timeline is readable  
✅ Activities are company-scoped  

---

## Step 6: Advanced Filtering & Search

**Files to Create/Modify:**
- `components/admin/leads/advanced-filters.tsx` - Advanced filter modal
- `lib/utils/lead-filters.ts` - Filter logic utilities

**What to Build:**

### 6.1 Advanced Filter Modal
Create modal with comprehensive filters:
- **Status**: Multi-select checkboxes
- **Source**: Multi-select checkboxes
- **Priority**: Multi-select checkboxes
- **Service Type**: Multi-select checkboxes
- **Assigned To**: User multi-select
- **Date Range**: Created between X and Y
- **Value Range**: Estimated value min/max
- **Location**: City/State filters
- **Tags**: Tag multi-select (if implementing tags)

### 6.2 Saved Filters
Allow saving filter combinations:
- "Hot Leads" (priority: high/urgent, status: qualified/follow_up)
- "Unassigned New Leads" (status: new, assigned_to: null)
- "Won This Month" (status: won, created this month)
- User can create custom saved filters

### 6.3 Filter URL State
Sync filters with URL query params:
- Shareable filtered views
- Back button preserves filters
- Bookmark filtered views

### 6.4 Bulk Actions
Select multiple leads and perform actions:
- Bulk assign
- Bulk status change
- Bulk delete
- Bulk export

**Success Criteria:**
✅ Advanced filters work correctly  
✅ Multiple filters combine properly  
✅ Saved filters persist  
✅ URL state syncs with filters  
✅ Bulk actions work  
✅ Filter performance is good (debounced)  

---

## Step 7: Lead Assignment & Notifications

**Files to Create/Modify:**
- `components/admin/leads/assign-user-dropdown.tsx` - Assignment UI
- `lib/hooks/use-users.ts` - Fetch users hook
- `lib/api/users.ts` - User list API

**What to Build:**

### 7.1 User List API
Fetch all users in company:
```typescript
export async function getCompanyUsers(
  companyId: string
): Promise<ApiResponse<User[]>>
```

### 7.2 Assignment Dropdown
Create user selector:
- Search users by name
- Show user avatar + name
- Option to unassign
- Update immediately on select

### 7.3 Assignment Logic
When lead is assigned:
- Update `assigned_to` field
- Create activity: "Assigned to [User Name]"
- (Future) Send notification to assigned user

### 7.4 My Leads View
Add filter preset for "My Leads":
- Show leads assigned to current user
- Quick toggle in header

### 7.5 Unassigned Leads Alert
On dashboard, show count of unassigned leads:
- Alert if > 5 unassigned leads
- Click to view unassigned leads

**Success Criteria:**
✅ Can assign leads to users  
✅ Assignment creates activity  
✅ My Leads filter works  
✅ Unassigned leads count shows  
✅ Assignment dropdown is searchable  

---

## Step 8: Polish & Optimization

**Final Touches:**

### 8.1 Loading States
- Skeleton loaders for tables
- Spinner for forms
- Optimistic updates for mutations

### 8.2 Error Handling
- Graceful error messages
- Retry logic for failed requests
- Offline detection

### 8.3 Performance
- Implement pagination (20 leads per page)
- Virtual scrolling for large lists
- Debounced search (300ms)
- Memoize expensive computations

### 8.4 Accessibility
- Keyboard navigation in table
- ARIA labels on interactive elements
- Focus management in modals
- Screen reader announcements

### 8.5 Mobile Polish
- Test on real devices
- Touch target sizes (44px min)
- Swipe gestures where appropriate
- Bottom sheet for mobile actions

### 8.6 Testing
- Test multi-tenant isolation (create 2nd company, verify no data leakage)
- Test all CRUD operations
- Test filters with large datasets
- Test mobile responsiveness

**Success Criteria:**
✅ All loading states look professional  
✅ Errors are user-friendly  
✅ Performance is snappy (<100ms interactions)  
✅ Accessible via keyboard  
✅ Mobile experience is excellent  
✅ Multi-tenant isolation verified  

---

## Phase 1 Completion Checklist

Before moving to Phase 2, verify:

- [ ] Lead list view with working filters
- [ ] Lead detail page with all information
- [ ] Create new lead form with validation
- [ ] Edit existing lead form
- [ ] Pipeline progress bar with inline status updates
- [ ] Activity timeline with quick add
- [ ] Advanced filtering modal
- [ ] Lead assignment system
- [ ] Mobile-responsive on all pages
- [ ] Multi-tenant isolation tested
- [ ] Performance optimized
- [ ] All committed to Git

---

## What's Next?

**Phase 2: Quote & Project Management**
- Quote generation with line items
- PDF generation & email sending
- Project creation from won leads
- Crew assignment & scheduling
- Project progress tracking
- Invoice generation

**Estimated Duration**: 3-4 weeks

---

**Last Updated**: November 28, 2024  
**Phase Status**: Ready to start  
**Prerequisites**: ✅ Phase 0 Complete
