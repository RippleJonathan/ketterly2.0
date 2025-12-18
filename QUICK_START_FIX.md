# Quick Start: Fix Material Creation

## 🚨 YOU MUST DO THIS FIRST

Material creation is broken. Here's the 2-minute fix:

## Step 1: Copy This SQL

```sql
-- Fix materials item_type constraint
ALTER TABLE public.materials 
  DROP CONSTRAINT IF EXISTS materials_item_type_check;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_item_type_check 
  CHECK (item_type IN ('material', 'labor', 'estimate', 'both'));

ALTER TABLE public.materials
  ALTER COLUMN item_type SET DEFAULT 'material';
```

## Step 2: Run in Supabase

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Paste the SQL above
6. Click **Run** (or press Ctrl+Enter)

## Step 3: Verify Success

You should see output like:
```
Success. No rows returned
Success. No rows returned
Success. No rows returned
```

or 

```
ALTER TABLE
ALTER TABLE
ALTER TABLE
```

## Step 4: Test It

1. Go to your app: http://localhost:3000
2. Navigate to **Settings** → **Product Catalog**
3. Click **Add Item**
4. Fill in:
   - Name: "Test Material"
   - Category: "shingles"
   - Item Type: "material"
   - Cost: 10.00
5. Click **Save**

### ✅ Success Looks Like:
- Green toast: "Material created successfully"
- Material appears in the list
- NO red errors in browser console (F12)

### ❌ Still Broken Looks Like:
- Red toast or console errors
- Material doesn't appear in list
- Console shows "violates check constraint"

## What If It's Still Broken?

Check these:

1. **Did the migration run?**
   - Check Supabase SQL Editor for green success message
   
2. **Are you on the right database?**
   - Verify project in Supabase dashboard matches your .env.local

3. **Check existing data:**
   ```sql
   -- Run this to see what values exist
   SELECT DISTINCT item_type FROM materials;
   ```

4. **Nuclear option (DESTRUCTIVE):**
   ```sql
   -- ONLY if you have no important material data
   -- This will delete all materials and recreate the table
   DROP TABLE IF EXISTS materials CASCADE;
   -- Then re-run your original migrations
   ```

## After It Works

See `RECENT_UPDATES_SUMMARY.md` for:
- What's new in the UI
- How to test templates
- Labor template import feature
- Complete testing checklist

## Need More Details?

See `URGENT_FIX_MATERIAL_CONSTRAINT.md` for:
- Detailed explanation
- Why this happened
- What changed in the code
- Complete testing guide
