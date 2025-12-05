# Apply Tax Migration

## Overview
This migration adds tax rate support to your material orders system. Companies can have different tax rates based on their state, and orders will automatically calculate tax amounts.

## What This Migration Does

1. **Adds tax_rate to companies table**
   - Stores sales tax rate as decimal (e.g., 0.0825 for 8.25%)
   - Sets default rates by state:
     - California: 7.25%
     - Texas: 6.25%
     - Florida: 6%

2. **Adds tax fields to material_orders table**
   - `tax_rate`: The tax rate applied to this specific order
   - `tax_amount`: Calculated tax (subtotal × tax_rate)
   - `total_with_tax`: Final total including tax

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Copy the entire contents of: `supabase/migrations/20241205000008_add_tax_to_orders.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Verify success message appears

### Option 2: Using run-migration.js Script

If you have the `exec_sql` RPC function set up:

```powershell
node run-migration.js supabase/migrations/20241205000008_add_tax_to_orders.sql
```

## After Migration

### 1. Set Your Company's Tax Rate

Go to Settings → Company Settings and update your tax rate. For example:
- If you're in California: `0.0725` (7.25%)
- If you're in Texas: `0.0625` (6.25%)
- Custom rate: Enter as decimal (8.5% = `0.085`)

### 2. Test Tax Calculation

1. Create a new material order from a template
2. The order will automatically use your company's tax rate
3. View the order card - you should see:
   - **Subtotal**: Material costs before tax
   - **Tax (X%)**: Calculated tax amount
   - **Total with Tax**: Final amount

### 3. What Happens to Existing Orders?

All existing orders will have `tax_rate = 0` by default, so they won't show tax calculations. This preserves their original totals.

## Features Now Available

✅ **Company Tax Rates**: Each company can have its own tax rate  
✅ **Automatic Tax Calculation**: Orders auto-calculate tax based on company rate  
✅ **Tax Display**: Order cards and detail dialogs show tax breakdown  
✅ **Auto-Updates**: Tax recalculates when you edit/delete line items  

## Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Check companies table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'tax_rate';

-- Check material_orders table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'material_orders' AND column_name IN ('tax_rate', 'tax_amount', 'total_with_tax');

-- Check your company's tax rate
SELECT id, name, state, tax_rate FROM companies;
```

You should see:
1. `tax_rate` column exists in companies table (DECIMAL 5,4)
2. Three tax columns exist in material_orders table
3. Your company has a tax_rate value set

## Troubleshooting

### Tax Not Showing on New Orders
- Check that your company has `tax_rate > 0` in the companies table
- Verify the migration ran successfully
- Hard refresh your browser (Ctrl+Shift+R)

### Existing Orders Showing Tax
- This is expected if you update the tax rate after creating orders
- Old orders preserve their original tax_rate from when they were created

### Wrong Tax Rate
- Update your company's tax_rate in the companies table
- New orders will use the updated rate
- Existing orders keep their original rate

## Next Steps

After applying this migration successfully:

1. ✅ Tax calculations are working
2. 🔧 Add "Edit All" button to batch-edit line items
3. 🔧 Add "Add Item" button to manually add materials
4. 🔧 Debug why accessories aren't importing from measurements

---

**Migration File**: `supabase/migrations/20241205000008_add_tax_to_orders.sql`  
**Created**: December 5, 2024
