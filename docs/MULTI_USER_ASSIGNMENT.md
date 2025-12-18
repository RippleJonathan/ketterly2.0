# Multi-User Lead Assignment Implementation

## Overview
Simplified multi-user assignment system that allows up to 4 different team members to be assigned to a single lead in specific roles.

## Database Changes

### New Columns Added to `leads` Table:
- `sales_rep_id` (renamed from `assigned_to`) - Primary sales representative
- `marketing_rep_id` - Marketing representative (optional)
- `sales_manager_id` - Sales manager (optional)  
- `production_manager_id` - Production manager (optional)

### Key Points:
- All assignment fields are optional (NULL allowed)
- Same user can be assigned to multiple roles on one lead
- Foreign key constraints to `users(id)` table
- Indexed for query performance

## Commission Logic

When a job is sold, commissions are calculated independently for each assigned user:

**Example:** $10,000 job with 3 assigned users:
- Sales Rep (10% commission rate) → $1,000
- Marketing Rep (5% commission rate) → $500
- Sales Manager (3% commission rate) → $300
- **Total commissions paid:** $1,800 (18% of job value)

Each user's commission is based on their individual commission plan rate.

## Auto-Fill Logic

When creating a new lead, the system automatically assigns the current user to the appropriate role:

- **Sales role** → Auto-fills Sales Rep field
- **Marketing role** → Auto-fills Marketing Rep field
- **Sales Manager role** → Auto-fills Sales Manager field
- **Production role** → Auto-fills Production Manager field

Users can then manually assign other team members to remaining roles.

## UI Changes

### Lead Form (Create/Edit):
- 4 separate dropdowns for role-based assignment
- All users in company appear in all dropdowns (no role filtering)
- "Unassigned" option for each field
- Auto-fill based on creator's role (create mode only)

### Quick Add Lead Modal:
- Same 4-dropdown structure
- Compact layout for mobile
- Auto-fill functionality

### Lead Detail Page:
- Shows all 4 assigned users with role labels
- Click to reassign any role
- Empty roles show "Unassigned"

## Migration Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20241217000001_multi_user_lead_assignment.sql`
3. Paste and run the migration
4. Verify columns were added to `leads` table

### Option 2: Using run-migration.js Script
```bash
node run-migration.js supabase/migrations/20241217000001_multi_user_lead_assignment.sql
```

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create new lead - verify auto-fill works
- [ ] Assign same user to multiple roles - verify it saves
- [ ] Leave roles unassigned - verify NULL is saved
- [ ] Edit existing lead - verify assignments load correctly
- [ ] Quick add lead - verify all fields work
- [ ] Lead detail page - verify all assigned users display
- [ ] Commission calculation - verify each user gets their rate

## Files Modified

1. **supabase/migrations/20241217000001_multi_user_lead_assignment.sql**
   - Database schema changes

2. **components/admin/leads/lead-form.tsx**
   - Updated form schema (4 assignment fields)
   - Added auto-fill logic
   - Replaced single dropdown with 4 role-based dropdowns
   - Updated submit logic

3. **components/admin/quick-add-lead-button.tsx** (TODO)
   - Same changes as lead-form.tsx

4. **app/(admin)/admin/leads/[id]/page.tsx** (TODO)
   - Display all 4 assigned users

5. **lib/actions/leads.ts** (TODO)
   - Update create/update actions to handle new fields

6. **Commission calculations** (TODO - Phase 2)
   - Update to calculate commissions for all assigned users

## Future Enhancements (Phase 2)

- [ ] Per-role commission percentage overrides
- [ ] Commission split calculator
- [ ] Team performance metrics by role
- [ ] Reassignment notifications
- [ ] Assignment history tracking

---

**Status:** Phase 1 - In Progress  
**Completed:** Database migration, Lead form updates  
**Remaining:** Quick add modal, Lead detail page, Server actions, Commission logic  
**Time Spent:** ~1 hour  
**Estimated Remaining:** ~1-2 hours
