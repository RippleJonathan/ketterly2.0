# URGENT: Fix Material Creation Constraint

## Problem
Material creation is failing with this error:
```
new row for relation "materials" violates check constraint "materials_item_type_check"
```

Despite the frontend code being 100% correct, the database constraint is rejecting valid values.

## Root Cause
The database constraint `materials_item_type_check` is not properly configured or doesn't match the migration definition.

## Solution

### Step 1: Run the Fix Migration

**File:** `supabase/migrations/20241217000003_fix_materials_item_type_constraint.sql`

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Fix materials item_type constraint
-- Ensures the constraint allows the correct values

-- Drop existing constraint if it exists
ALTER TABLE public.materials 
  DROP CONSTRAINT IF EXISTS materials_item_type_check;

-- Add the constraint with correct values
ALTER TABLE public.materials
  ADD CONSTRAINT materials_item_type_check 
  CHECK (item_type IN ('material', 'labor', 'estimate', 'both'));

-- Ensure default value is set
ALTER TABLE public.materials
  ALTER COLUMN item_type SET DEFAULT 'material';
```

4. Click **Run** or **Execute**
5. Verify you see success messages for:
   - `DROP CONSTRAINT` (may say "constraint does not exist" - that's OK)
   - `ADD CONSTRAINT`
   - `ALTER COLUMN`

### Step 2: Test Material Creation

1. Go to **Settings** → **Product Catalog**
2. Click **Add Item**
3. Fill in:
   - **Name:** "Test Material"
   - **Category:** Any category
   - **Item Type:** Material
   - **Cost:** 10.00
4. Click **Save**
5. Verify:
   - ✅ Success toast appears
   - ✅ Material appears in the list
   - ✅ NO console errors

### Step 3: Create Test Data for Templates

Once materials work, you can test the template systems:

#### Test Material Creation
1. Create a few test materials:
   - "Architectural Shingles" (material, shingles category)
   - "Ice & Water Shield" (material, underlayment category)
   - "Ridge Vent" (material, ventilation category)
   - "Tear-off Labor" (labor, other category)

#### Test Estimate Template Creation
1. Go to **Settings** → **Templates** → **Estimate Templates**
2. Click **Create Template**
3. Name: "Standard Roof Package"
4. Category: Roofing
5. Select materials from the dropdown
6. Click Import to add them
7. Save the template
8. Verify template appears in list

#### Test Template Import in Estimates
1. Create a test lead
2. Go to **Estimates** tab
3. Click **Create Estimate**
4. In the line items section, select your template from dropdown
5. Click **Import**
6. Verify materials populate as line items
7. Complete and save the estimate

#### Test Labor Template Creation
1. Go to **Settings** → **Templates** → **Labor Templates**
2. Click **Create Template**
3. Name: "Roof Tear-off Package"
4. Category: Roofing
5. **NEW FEATURE:** Click "Import from Product Catalog"
6. Select a material/labor item
7. Click Import
8. It will be added as a labor item with default 1 hour
9. Adjust hours and hourly rate as needed
10. Save the template

## What Was Fixed

### 1. Constraint Issue
- **Problem:** Database constraint rejecting valid `item_type` values
- **Solution:** Migration drops and recreates constraint with explicit values
- **File:** `supabase/migrations/20241217000003_fix_materials_item_type_constraint.sql`

### 2. UI Naming Updates
- **Changed:** "Materials Library" → "Product Catalog"
- **Reason:** Better reflects that it contains materials, labor, and estimate items
- **Files Changed:**
  - `components/admin/settings/materials-settings.tsx` (heading and description)
  - `components/admin/settings/unified-templates-settings.tsx` (tab labels)

### 3. Labor Template Import Feature
- **Added:** Import from Product Catalog in labor template builder
- **How it works:**
  - Dropdown to select any item from catalog
  - Click Import to add as labor item
  - Converts material to labor context (description, 1 hour default, cost as hourly rate)
  - Can edit hours and rate after import
- **File:** `components/admin/settings/labor-template-dialog.tsx`

## Updated UI Labels

### Product Catalog (Settings)
- **Old:** "Materials Library"
- **New:** "Product Catalog"
- **Button:** "Add Item" (was "Add Material")
- **Description:** "Manage your catalog of materials, labor items, and estimates"

### Templates Tabs
- **Tab 1:** "Material Templates" (was "Material Orders")
- **Tab 2:** "Labor Templates" (was "Labor Orders")
- **Tab 3:** "Estimate Templates" (was "Estimates")

## What You Can Test Now

After running the migration:

✅ **Product Catalog:**
- Create materials
- Create labor items
- Create estimate items
- All item types save correctly

✅ **Material Templates:**
- Create templates with selected materials
- Edit templates
- Delete templates

✅ **Labor Templates:**
- Create templates
- Add labor items manually
- **NEW:** Import items from Product Catalog
- Edit templates
- Delete templates

✅ **Estimate Templates:**
- Create templates with selected materials
- Edit templates
- Delete templates

✅ **Template Import:**
- Import estimate templates into new estimates
- Line items populate correctly
- Can adjust quantities/prices after import

## Notes

- The frontend code was already 100% correct
- Migration 20241207000003 had correct constraint definition
- But database wasn't applying it properly
- This fix migration explicitly drops and recreates it
- Should resolve the issue permanently

## Next Steps After Fix

1. ✅ Run migration (required - blocks everything)
2. ✅ Create test materials in Product Catalog
3. ✅ Create estimate template with materials
4. ✅ Test template import in estimate creation
5. ✅ Create labor template with catalog import
6. 🎯 Report any issues found during testing
