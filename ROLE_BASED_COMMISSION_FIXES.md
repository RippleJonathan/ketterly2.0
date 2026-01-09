# Role-Based Commission Testing Fixes

## Issues Fixed (January 8, 2026)

### 1. ✅ Hide Users Navigation for Sales/Marketing/Production Roles
**File**: `components/admin/sidebar.tsx`

Sales, marketing, and production users no longer see the "Users" menu item in the navigation. They don't have permission to view the page anyway, so we removed it from their nav completely.

**Before**: Users nav visible but clicking showed permission error  
**After**: Users nav completely hidden for sales/marketing/production roles

---

### 2. ✅ Auto-Assign Location When Creating Lead
**File**: `components/admin/leads/lead-form.tsx`

When creating a new lead, the location field now auto-fills based on the user's assigned locations:
- Users with **one location** → Auto-selects that location
- Admin with **default location** → Auto-selects default location
- Users with multiple locations → Must choose manually

**Before**: Location always blank, had to select manually  
**After**: Location pre-filled for convenience

---

### 3. ✅ Auto-Assign Team Roles on Lead Creation
**File**: `components/admin/leads/lead-form.tsx`

Team assignments now auto-fill based on the user's role when creating a lead:

| User Role       | Auto-Assigned Fields                                    | Notes                          |
|-----------------|---------------------------------------------------------|--------------------------------|
| **Sales**       | Sales Rep ✅ + Marketing Rep ✅                         | Self-gen = dual commission     |
| **Marketing**   | Marketing Rep ✅                                        | Must manually choose sales rep |
| **Sales Manager** | Sales Manager ✅                                      |                                |
| **Production**  | Production Manager ✅                                   |                                |

**Before**: All fields blank, had to manually select yourself  
**After**: Relevant fields pre-filled, can change if needed

---

### 4. ✅ Auto-Assign Office Manager
**File**: `components/admin/leads/lead-form.tsx`

**CRITICAL FIX**: Every lead now automatically gets the office manager assigned based on the selected location.

When you select a location (or it auto-fills), the system:
1. Queries `location_users` for `office_role = true` at that location
2. Auto-fills `office_manager_id` field

**Before**: Office manager always blank  
**After**: Office manager auto-assigned from location settings

---

### 5. ✅ Filter Leads by User Role
**File**: `app/(admin)/admin/leads/page.tsx`

Lead visibility is now properly restricted based on user role:

| Role                        | Can See                                    |
|-----------------------------|--------------------------------------------|
| **Sales Rep**               | Only leads where they are `sales_rep_id`   |
| **Marketing Rep**           | Only leads where they are `marketing_rep_id` |
| **Sales Manager**           | All leads in their assigned location(s)    |
| **Production Manager**      | All leads in their assigned location(s)    |
| **Office**                  | All leads in their assigned location(s)    |
| **Admin/Super Admin**       | All leads company-wide                     |

**Before**: Sales/marketing saw leads they were assigned to in ANY role  
**After**: Sales reps ONLY see their sales leads, marketing reps ONLY see their marketing leads

---

### 6. ✅ Fix Marketing Rep Display in Edit Details
**File**: `components/admin/leads/lead-form.tsx`

The auto-assignment logic was restructured to run when the location is selected. This ensures:
1. Location is set first
2. Office manager is fetched and assigned
3. User's role-based assignments are applied (sales rep + marketing rep for sales role)

**Before**: Marketing rep field showed empty even though it was assigned  
**After**: Marketing rep field correctly shows assigned user (frederick mercury)

The form now properly displays all auto-assigned fields in both view and edit modes.

---

## Testing Checklist

### As Sales Rep (frederick mercury)
- [x] Navigate to admin - "Users" nav item is hidden ✅
- [x] Click "Add Lead" - Location pre-filled to your assigned location ✅
- [x] Sales Rep field shows "frederick mercury" ✅
- [x] Marketing Rep field shows "frederick mercury" ✅
- [x] Office Manager field shows assigned office manager for location ✅
- [x] Create lead - redirects to leads list
- [x] Leads list only shows leads where you are sales_rep_id ✅

### As Marketing Rep
- [ ] Navigate to admin - "Users" nav item is hidden
- [ ] Click "Add Lead" - Location pre-filled
- [ ] Marketing Rep field shows your name
- [ ] Sales Rep field is empty (must choose manually)
- [ ] Office Manager field shows assigned office manager
- [ ] Create lead - redirects to leads list
- [ ] Leads list only shows leads where you are marketing_rep_id

### As Sales Manager
- [ ] "Users" nav item is visible
- [ ] Leads list shows ALL leads in assigned locations (not just your assigned leads)

### As Admin
- [ ] Can see all leads across all locations
- [ ] Can edit team assignments after lead creation
- [ ] Can assign office managers in location settings

---

## Next Steps

1. **Test Commission Calculation**
   - Create a sales rep user
   - Set commission rates:
     - Sales role: 10%
     - Marketing role: 5%
   - Create self-gen lead (should get both commissions)
   - Generate invoice
   - Verify commissions created correctly (15% total)

2. **Test Permission Restrictions**
   - Login as sales rep
   - Open existing lead
   - Verify team assignment dropdowns are disabled
   - Verify tooltips show "You don't have permission" messages

3. **Build Admin UI for Commission Rates**
   - Add commission rate section to user edit form
   - Allow admins to configure per-role rates for each user

---

## Technical Details

### Database Schema
- `user_permissions`: +4 columns (can_assign_sales_rep, can_assign_sales_manager, can_assign_marketing_rep, can_assign_production_manager)
- `users`: +9 columns (3 roles × 3 commission fields)

### Commission Priority
1. Office Manager Override (location_users.commission_enabled=true)
2. Team Lead Override (teams.team_lead_id)
3. User Commission Plan (users.commission_plan_id)
4. Location Override (location_users)
5. **Role-Based Rates** (users.sales_commission_rate, marketing_commission_rate, production_commission_rate)
6. $0 default

### Files Modified
- `components/admin/sidebar.tsx` - Hide Users nav for sales/marketing/production
- `components/admin/leads/lead-form.tsx` - Auto-assign location, office manager, team roles
- `app/(admin)/admin/leads/page.tsx` - Filter leads by user role
- `lib/utils/auto-commission.ts` - Calculate commissions from role-based rates
- `components/admin/leads/editable-details-tab.tsx` - Permission gating on team assignment dropdowns
- `components/admin/leads/multi-user-assignments.tsx` - Permission gating on quick assignment widget

---

**Status**: All 6 issues fixed ✅  
**Ready for**: End-to-end commission testing
