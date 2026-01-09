# Team-Based Commission System - Implementation Summary

## 🎯 What Changed

We've pivoted from **one Team Lead per location** to **multiple teams per location** with team-specific Team Leads.

### Previous Architecture (Wrong)
```
Location → ONE Team Lead → Override on ALL sales at location
```

### New Architecture (Correct)
```
Location
├── Office Manager (3% override on ALL location sales)
├── Team Alpha
│   ├── Team Lead: Billy (2% override on Team Alpha sales ONLY)
│   ├── Sales Rep: John
│   └── Sales Rep: Jane
└── Team Bravo
    ├── Team Lead: Sally (2% override on Team Bravo sales ONLY)
    ├── Sales Rep: Mike
    └── Sales Rep: Sarah
```

---

## 📊 Database Changes

### New Table: `teams`
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  location_id UUID REFERENCES locations(id),
  name TEXT NOT NULL,                    -- e.g., "Team Alpha", "Roofing Crew 1"
  team_lead_id UUID REFERENCES users(id), -- The sales_manager leading this team
  commission_rate DECIMAL(5,2),          -- Team Lead override % (e.g., 2.0 = 2%)
  paid_when TEXT,                        -- When commission is paid
  include_own_sales BOOLEAN,             -- Team Lead gets override on own sales?
  is_active BOOLEAN,
  UNIQUE (location_id, name)             -- Team names unique per location
);
```

### Updated Table: `location_users`
```sql
ALTER TABLE location_users 
ADD COLUMN team_id UUID REFERENCES teams(id);
```

Now sales reps can be assigned to a team via `team_id`.

---

## 🔧 How It Works

### Commission Creation Logic

**When a lead is created/updated with a sales rep:**

1. **Office Manager Commission** (if exists)
   - Checks `location_users` for Office role with `commission_enabled=true`
   - Creates override commission on ALL sales at that location

2. **Team Lead Commission** (NEW - team-based)
   - Checks if `sales_rep` is assigned to a team (`location_users.team_id`)
   - If yes, gets the team's `team_lead_id`
   - Creates override commission ONLY if sales_rep is on that Team Lead's team
   - Respects `include_own_sales` flag (skip if Team Lead is also the sales rep)

3. **Assigned User Commissions**
   - Creates commissions for sales_rep, marketing_rep, etc. from their commission plans

### Example Scenario

**Setup:**
- Location: Arizona Office
- Office Manager: Jonathan (3% on all sales)
- Team Alpha: Billy (Team Lead, 2% override), John (sales rep), Jane (sales rep)
- Team Bravo: Sally (Team Lead, 2% override), Mike (sales rep)

**Lead Created:**
- Sales Rep: John
- Invoice Total: $10,000

**Commissions Created:**
1. Jonathan (Office Manager): 3% × $10,000 = $300
2. Billy (Team Lead): 2% × $10,000 = $200 ← Only because John is on Billy's team
3. John (Sales Rep): 15% × $10,000 = $1,500 (from his commission plan)

**If Sales Rep = Mike:**
- Same as above, but Billy gets nothing (Mike not on Billy's team)
- Sally gets 2% × $10,000 = $200 (Mike is on Sally's team)

---

## 🧪 Testing Steps

### Step 1: Run Migration
```bash
# Copy/paste this file into Supabase Dashboard SQL Editor:
supabase/migrations/20260108000004_create_teams_system.sql
```

### Step 2: Create a Test Team
```javascript
// Run this in browser console or create test script
const { data: arizonaOffice } = await supabase
  .from('locations')
  .select('id')
  .eq('name', 'Arizona Office')
  .single()

const { data: billy } = await supabase
  .from('users')
  .select('id')
  .eq('email', 'billy@example.com') // Billy Idol
  .single()

// Create Team Alpha
const { data: team } = await supabase
  .from('teams')
  .insert({
    company_id: 'YOUR_COMPANY_ID',
    location_id: arizonaOffice.id,
    name: 'Team Alpha',
    team_lead_id: billy.id,
    commission_rate: 2.0,
    paid_when: 'when_final_payment',
    include_own_sales: false,
    is_active: true
  })
  .select()
  .single()

console.log('✅ Team created:', team)
```

### Step 3: Assign Sales Rep to Team
```javascript
// Assign Silly Willy to Team Alpha
const { data: sillyWilly } = await supabase
  .from('users')
  .select('id')
  .eq('full_name', 'Silly Willy')
  .single()

const { data: locationUser } = await supabase
  .from('location_users')
  .update({ team_id: team.id })
  .eq('user_id', sillyWilly.id)
  .eq('location_id', arizonaOffice.id)
  .select()

console.log('✅ Sales rep assigned to team:', locationUser)
```

### Step 4: Test Commission Creation
```javascript
// Go to a lead with Silly Willy as sales rep
// Click the "Refresh" button on Commissions tab
// Expected result:
// 1. Jonathan Ketterman (Office): 3% = $677.66
// 2. Billy Idol (Team Lead): 2% = $451.77 ← NEW team-based override
// 3. Silly Willy (Sales Rep): 15% = $3,388.28
// 4. Todd Night (Marketing): $50 flat
```

### Step 5: Test Team Isolation
```javascript
// Change lead sales_rep to someone NOT on Billy's team
// Click "Refresh" on Commissions tab
// Expected result:
// - Billy should NOT get Team Lead commission (sales rep not on his team)
// - Only Office Manager + assigned user commissions
```

---

## 🚨 Breaking Changes

### What NO LONGER Works
1. **`team_lead_for_location` field in `location_users`** - No longer used
2. **One Team Lead per location logic** - Replaced with team-based logic
3. **TeamLeadCard component** - Needs to be replaced with Teams management UI

### What Still Works
1. **Office Manager commissions** - Unchanged, still location-wide override
2. **Assigned user commissions** - Unchanged, still from commission_plans
3. **paid_when and include_own_sales** - Still work, but now on `teams` table

---

## 📋 Next Steps

### 1. Build Teams Management UI
Create a new "Teams" tab in Location settings (`/admin/settings/locations/[id]`) with:
- List of teams at this location
- "Create Team" button
- For each team:
  - Team name
  - Team Lead (dropdown of sales_managers at location)
  - Commission rate (%)
  - Paid when (dropdown)
  - Include own sales (toggle)
  - List of team members (sales reps)
  - "Add Member" / "Remove Member" buttons

### 2. Update Lead Details Hierarchy (Task 3)
- Show: Office Manager → Team Lead (from sales_rep's team) → Sales Rep → Marketing Rep
- Make sales_rep and marketing_rep editable
- Auto-populate sales_manager from sales_rep's team (read-only)

### 3. Auto-Assign Team Lead (Task 4)
- When sales_rep changes, update sales_manager_id from their team's team_lead_id
- Clear sales_manager if sales_rep has no team

---

## 🔄 Migration Path

If you already have data with `team_lead_for_location=true`:

```sql
-- Create teams from existing team leads
INSERT INTO teams (company_id, location_id, name, team_lead_id, commission_rate, paid_when, include_own_sales)
SELECT 
  l.company_id,
  lu.location_id,
  u.full_name || '''s Team' as name,
  lu.user_id as team_lead_id,
  lu.commission_rate,
  lu.paid_when,
  lu.include_own_sales
FROM location_users lu
JOIN locations l ON l.id = lu.location_id
JOIN users u ON u.id = lu.user_id
WHERE lu.team_lead_for_location = true;

-- Then manually assign sales reps to their team via location_users.team_id
```

---

## ✅ Summary

**Old System:**
- One Team Lead per location
- Team Lead gets override on ALL location sales

**New System:**
- Multiple teams per location
- Each team has a Team Lead
- Team Lead only gets override on THEIR team's sales
- Supports growing sales organization with multiple crews/teams

This is now correctly architected for a scaling roofing business! 🏗️
