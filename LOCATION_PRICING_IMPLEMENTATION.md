# Location Pricing System Implementation

## Overview
Complete implementation of a three-tier location-based pricing system for materials with supplier-specific pricing.

## Pricing Architecture

### Three-Tier Pricing Model
1. **Global Catalog** (`materials` table)
   - Base prices as reference
   - Company-wide material definitions
   
2. **Location Default Pricing** (`location_material_pricing` table)
   - Each location can customize material prices
   - Overrides global catalog pricing
   - Used when no supplier-specific pricing exists
   
3. **Location + Supplier Pricing** (`supplier_material_pricing` table) - NEW
   - Supplier-specific deals per location
   - Always location-scoped (location_id required)
   - Includes supplier SKU, lead time, minimum order qty, notes
   
### Pricing Waterfall Logic
When resolving material prices, system checks in order:
1. Supplier-specific price (if supplier selected)
2. Location default price
3. Base catalog price

## Files Created

### Database Migration
📄 `supabase/migrations/20241231000001_add_supplier_material_pricing.sql`
- New table: `supplier_material_pricing`
- Columns: id, location_id (NOT NULL), supplier_id, material_id, cost, effective_date, supplier_sku, lead_time_days, minimum_order_qty, notes, timestamps
- Unique constraint: (location_id, supplier_id, material_id)
- RLS policies: SELECT (company users), ALL (admin/office with location restrictions)
- Indexes: location_id, supplier_id, material_id, composite (location+supplier)
- Triggers: auto-update updated_at

📄 `run-supplier-pricing-migration.js`
- Node.js script to execute migration
- Uses Supabase admin client
- Verification step to confirm table creation

### API Layer
📄 `lib/api/locations.ts` (Modified)
- Added TypeScript interfaces:
  - `SupplierMaterialPrice`
  - `SupplierMaterialPriceInsert`
- New API functions:
  - `getLocationSupplierPricing(locationId, supplierId?)`
  - `setLocationSupplierPrice(data)`
  - `removeLocationSupplierPrice(priceId)`
  - `getMaterialEffectivePrice(materialId, locationId, supplierId?)`

### React Query Hooks
📄 `lib/hooks/use-locations.ts` (Modified)
- New hooks:
  - `useLocationSupplierPricing(locationId, supplierId?)`
  - `useSetLocationSupplierPrice()`
  - `useRemoveLocationSupplierPrice()`
  - `useMaterialEffectivePrice(materialId, locationId, supplierId?)`

📄 `lib/hooks/use-location-material-pricing.ts` (New)
- Hooks for location default pricing:
  - `useLocationMaterialPricing(locationId)`
  - `useSetLocationMaterialPrice()`
  - `useRemoveLocationMaterialPrice()`
- Types: `LocationMaterialPrice`, `LocationMaterialPriceInsert`

### UI Components
📄 `components/admin/locations/location-pricing-tab.tsx`
- Main container with two tabs
- Permission checking (admin/office only)
- Info banners with contextual messaging
- Props: locationId, locationName

📄 `components/admin/locations/location-default-pricing-tab.tsx`
- Shows all materials with location default pricing
- Search functionality
- Table with columns: Material Name, Type, Unit, Base Price (admin only), Location Price, Actions
- ⭐ indicator for custom pricing
- Edit button opens EditPriceDialog

📄 `components/admin/locations/location-supplier-pricing-tab.tsx`
- Supplier dropdown selector
- Shows supplier-specific pricing for selected supplier
- Table with columns: Material Name, Supplier SKU, Cost, Lead Time, Min Order, Notes, Actions
- Add Material button
- Edit/Delete actions per row

📄 `components/admin/locations/edit-price-dialog.tsx`
- Dialog for editing location default prices
- Shows base price reference
- Price input with markup/discount calculation
- Notes textarea
- "Reset to Base" button (removes override)
- Save button (upserts price)

📄 `components/admin/locations/edit-supplier-price-dialog.tsx`
- Dialog for adding/editing supplier-specific prices
- Material selector (add mode)
- Shows location default price reference
- Inputs: Cost, Supplier SKU, Lead Time, Min Order Qty, Notes
- Savings indicator when supplier price is lower
- Save button (upserts price)

## Permission Model

### Admin Users
- Can view/edit pricing for ALL locations
- See both base price and location price in tables
- Full access to all pricing management features

### Office Users
- Can view/edit pricing for their ASSIGNED locations only
- See both base price and location price in tables
- Full access to pricing for their locations

### Sales/Other Users
- Read-only view of effective prices for their location
- Cannot edit pricing
- See only the effective price (not base vs location breakdown)

## Key Features

### Location Default Pricing
- ✅ View all materials with location-specific pricing
- ✅ Search/filter materials
- ✅ Edit location price with markup/discount calculation
- ✅ Reset to base price (removes override)
- ✅ Add notes for pricing context
- ✅ Visual indicators (⭐) for custom pricing

### Supplier-Specific Pricing
- ✅ Select supplier to view/manage their pricing
- ✅ Add new materials to supplier pricing
- ✅ Edit existing supplier prices
- ✅ Track supplier SKU, lead time, minimum order qty
- ✅ Add notes for special terms/discounts
- ✅ Delete supplier pricing (revert to location default)
- ✅ Shows savings vs location default price

### Automatic Price Resolution
- ✅ Waterfall pricing logic (supplier → location → base)
- ✅ `useMaterialEffectivePrice()` hook for automatic resolution
- ✅ Source tracking (knows where price came from)
- ✅ Transparent to end users (just works)

## Testing Checklist

### Before Testing
- [ ] Run migration: `node run-supplier-pricing-migration.js`
- [ ] Verify table created in Supabase dashboard
- [ ] Check RLS policies are active

### Test as Admin
- [ ] Navigate to location settings
- [ ] Open pricing tab
- [ ] View default pricing tab
- [ ] Edit a location price (should save)
- [ ] Reset a location price (should revert to base)
- [ ] Switch to supplier pricing tab
- [ ] Select a supplier
- [ ] Add supplier-specific pricing for a material
- [ ] Edit supplier pricing (should save)
- [ ] Delete supplier pricing (should remove)
- [ ] Verify pricing waterfall works (supplier > location > base)

### Test as Office User
- [ ] Login as office user assigned to one location
- [ ] Navigate to their location settings
- [ ] Verify can access pricing tab
- [ ] Edit location default price (should work)
- [ ] Edit supplier pricing (should work)
- [ ] Try to access another location's pricing (should fail/redirect)

### Test as Sales User
- [ ] Login as sales user
- [ ] Try to access pricing tab (should see read-only or be blocked)
- [ ] Verify cannot edit any pricing

## Usage Example

### In a Quote/Order Flow
```typescript
// When creating a quote line item
const { data: effectivePrice } = useMaterialEffectivePrice(
  materialId,
  locationId,
  selectedSupplierId // Optional
)

// Price automatically resolved:
// - If supplier selected: uses supplier price if available
// - Falls back to location default price
// - Falls back to base catalog price
// effectivePrice.data.price is the final price to use
// effectivePrice.data.source tells you where it came from
```

## Next Steps

1. **Run Migration**
   ```bash
   node run-supplier-pricing-migration.js
   ```

2. **Integrate into Location Detail Page**
   - Create `/admin/settings/locations/[id]/page.tsx`
   - Add LocationPricingTab to page tabs
   - Test with real data

3. **Test Complete Flow**
   - Follow testing checklist above
   - Verify permissions work correctly
   - Ensure pricing waterfall logic works

4. **Use in Order/Quote Creation**
   - Integrate `useMaterialEffectivePrice()` hook
   - Display effective prices in material pickers
   - Track pricing source for transparency

## Database Schema

### supplier_material_pricing Table
```sql
CREATE TABLE supplier_material_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  material_id UUID NOT NULL REFERENCES materials(id),
  cost NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
  effective_date TIMESTAMPTZ DEFAULT NOW(),
  supplier_sku TEXT,
  lead_time_days INTEGER CHECK (lead_time_days >= 0),
  minimum_order_qty NUMERIC(10,2) CHECK (minimum_order_qty >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(location_id, supplier_id, material_id)
);
```

### Key Constraints
- Location ID is REQUIRED (no company-wide supplier pricing)
- Unique constraint ensures one price per location+supplier+material combo
- All numeric fields validated (>= 0)
- Soft deletes via deleted_at

## Architecture Benefits

✅ **Simple**: Just three tiers, easy to understand
✅ **Flexible**: Each location can customize as needed
✅ **Automatic**: Pricing resolution is transparent
✅ **Secure**: RLS policies enforce location boundaries
✅ **Scalable**: Works for single or multi-location companies
✅ **Auditable**: Tracks creation/update timestamps
✅ **Reversible**: Can reset to base pricing anytime

## Status

✅ Database migration created and ready
✅ API layer complete with waterfall pricing logic
✅ React Query hooks implemented
✅ UI components built and styled
✅ Permission system integrated
✅ Documentation complete

**Ready for testing and integration!**

---

*Last Updated: December 31, 2024*
