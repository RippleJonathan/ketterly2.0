# Location Pricing Fixes - December 31, 2024

## Issue #1: Estimate Price Update Error ✅ FIXED

### Problem
When trying to update pricing for an estimate item, the following error occurred:
```
invalid input syntax for type uuid: "our_price"
```

### Root Cause
Estimate items were trying to save to `supplier_material_pricing` table with `'our_price'` as the `supplier_id`, but the database requires a valid UUID for `supplier_id`.

### Solution
Estimate items now save to `location_material_pricing` table (location default pricing) instead of `supplier_material_pricing` table:

**Changes Made**:
1. Added `useSetLocationMaterialPrice` and `useLocationMaterialPricing` hooks
2. For estimate items (`item_type === 'estimate'`):
   - Save to `location_material_pricing` table
   - Load existing prices from `location_material_pricing`
   - Show "Our Price" instead of supplier list
3. For material/labor items:
   - Continue using `supplier_material_pricing` table
   - Filter suppliers by type (material_supplier vs subcontractor)

**Files Modified**:
- `components/admin/locations/edit-material-pricing-dialog.tsx`

### How It Works Now
```
Estimate Items:
  Edit → "Our Price" dialog → Saves to location_material_pricing

Material Items:
  Edit → Supplier list (filtered: material_supplier + both) → Saves to supplier_material_pricing

Labor Items:
  Edit → Supplier list (filtered: subcontractor + both) → Saves to supplier_material_pricing
```

---

## Issue #2: Work Order Location-Specific Pricing ⚠️ NOT YET IMPLEMENTED

### Current State
**Work orders do NOT currently use location-specific pricing.** They use the global base cost (`material.current_cost`).

### Where Pricing Is Set
In `components/admin/leads/edit-work-order-dialog.tsx`:
- Line 320: `setSelectedVariantPrice(material.current_cost || 0)`
- Line 464: `unit_price: tm.material.current_cost || 0`

Both use `material.current_cost` which is the global base cost, not location-specific pricing.

### Why This Happens
1. Work orders don't have a direct `location_id` field
2. Work orders link to leads via `lead_id`
3. Leads have `location_id` (the job site location)
4. The material selection dialog doesn't fetch location-specific pricing

### Implementation Plan

To implement location-specific pricing for work orders, we need to:

#### Step 1: Fetch Lead Location
```typescript
// In EditWorkOrderDialog component
const [leadLocationId, setLeadLocationId] = useState<string | null>(null)

// Load lead location when work order loads
useEffect(() => {
  if (workOrder?.lead_id) {
    const fetchLeadLocation = async () => {
      const { data } = await supabase
        .from('leads')
        .select('location_id')
        .eq('id', workOrder.lead_id)
        .single()
      
      setLeadLocationId(data?.location_id || null)
    }
    fetchLeadLocation()
  }
}, [workOrder?.lead_id])
```

#### Step 2: Create Pricing Lookup Utility
Create `lib/utils/location-pricing.ts`:
```typescript
/**
 * Get the best price for a material at a location
 * Priority: Location + Supplier > Location Default > Material Base Cost
 */
export async function getMaterialPriceForLocation(
  materialId: string,
  locationId: string | null,
  supplierId?: string | null
): Promise<number> {
  const supabase = createClient()
  
  // No location = use base cost
  if (!locationId) {
    const { data } = await supabase
      .from('materials')
      .select('current_cost')
      .eq('id', materialId)
      .single()
    return data?.current_cost || 0
  }
  
  // Try location + supplier price first (most specific)
  if (supplierId) {
    const { data: supplierPrice } = await supabase
      .from('supplier_material_pricing')
      .select('cost')
      .eq('location_id', locationId)
      .eq('supplier_id', supplierId)
      .eq('material_id', materialId)
      .is('deleted_at', null)
      .single()
    
    if (supplierPrice) return supplierPrice.cost
  }
  
  // Try location default price
  const { data: locationPrice } = await supabase
    .from('location_material_pricing')
    .select('cost')
    .eq('location_id', locationId)
    .eq('material_id', materialId)
    .is('deleted_at', null)
    .single()
  
  if (locationPrice) return locationPrice.cost
  
  // Fall back to base material cost
  const { data } = await supabase
    .from('materials')
    .select('current_cost')
    .eq('id', materialId)
    .single()
  
  return data?.current_cost || 0
}
```

#### Step 3: Update Material Selection
When adding materials to work order, use location pricing:

```typescript
// In handleAddMaterialFromBrowser function
const handleAddMaterialFromBrowser = async (material: Material) => {
  const quantity = calculateMaterialQuantity(/* ... */)
  
  // GET LOCATION-SPECIFIC PRICE
  const unitPrice = await getMaterialPriceForLocation(
    material.id,
    leadLocationId, // From step 1
    null // No supplier specified
  )
  
  // Add to line items with location price
  const newItem: LineItemEdit = {
    // ...
    unit_price: unitPrice, // Was: material.current_cost
    // ...
  }
  // ...
}
```

#### Step 4: Update Template Material Pricing
When adding from templates:

```typescript
// In handleAddTemplate function
for (const tm of templateMaterials) {
  const unitPrice = await getMaterialPriceForLocation(
    tm.material.id,
    leadLocationId,
    null
  )
  
  const item: LineItemEdit = {
    // ...
    unit_price: unitPrice, // Was: tm.material.current_cost || 0
    // ...
  }
}
```

### Testing Plan
Once implemented, test:
1. Create a work order for an Arizona location lead
2. Add materials to the work order
3. Verify prices match Arizona location pricing (not global base cost)
4. Check both:
   - Direct material addition
   - Template-based material addition

### Benefits
- Work orders for Arizona jobs get Arizona pricing
- Work orders for Texas jobs get Texas pricing
- More accurate cost estimates per location
- Better profit margin tracking by location

---

## Summary

✅ **Fixed**: Estimate price updates now work correctly (save to `location_material_pricing`)

⚠️ **Not Yet Implemented**: Work orders still use global base cost, not location-specific pricing

**Recommendation**: Implement work order location pricing following the plan above to ensure Arizona locations get Arizona pricing when creating work orders.
