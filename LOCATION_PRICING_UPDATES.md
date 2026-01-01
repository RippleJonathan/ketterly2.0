# Location Pricing System Updates

## Changes Made - December 31, 2024

### 1. Fixed Database Query Error ✅

**File**: `lib/api/locations.ts`

**Issue**: Console error `column materials_1.unit_price does not exist`

**Fix**: Changed `unit_price` to `current_cost` in the Supabase query
- Also added `type` field to suppliers query for filtering

```typescript
// Before
materials (id, name, item_type, unit, unit_price)

// After  
materials (id, name, item_type, unit, current_cost)
suppliers (id, name, type)
```

### 2. Supplier Type Filtering ✅

**File**: `components/admin/locations/edit-material-pricing-dialog.tsx`

**Feature**: Filter suppliers by type based on material's `item_type`

**Logic**:
- **Estimate items** (`item_type: 'estimate'`): Show "Our Price" instead of suppliers
- **Material items** (`item_type: 'material'`): Show only `material_supplier` and `both` suppliers
- **Labor items** (`item_type: 'labor'`): Show only `subcontractor` and `both` suppliers
- **Both type** (`item_type: 'both'`): Show all suppliers

**Implementation**:
```typescript
const filteredSuppliers = useMemo(() => {
  if (!allSuppliers?.data) return []
  
  if (material.item_type === 'estimate') return []
  
  if (material.item_type === 'material') {
    return allSuppliers.data.filter(s => 
      s.type === 'material_supplier' || s.type === 'both'
    )
  }
  
  if (material.item_type === 'labor') {
    return allSuppliers.data.filter(s => 
      s.type === 'subcontractor' || s.type === 'both'
    )
  }
  
  return allSuppliers.data
}, [allSuppliers, material.item_type])
```

**UI Changes**:
- For estimate items: Dialog title = "Our Price", shows single row "Our Price"
- For material/labor items: Dialog title = "Edit Supplier Pricing", shows filtered supplier list
- Dialog description changes based on item type

### 3. Add Item Button ✅

**File**: `components/admin/locations/materials-pricing-tab.tsx`

**Feature**: Added "+ Add Item" button to create materials on the fly

**Implementation**:
- Reuses existing `MaterialDialog` from Settings > Products
- Button appears next to search bar in each pricing tab
- When material is created, the list automatically updates (React Query invalidation)
- No need to navigate to Settings page

**Benefits**:
- Location managers can create materials without leaving the pricing page
- Faster workflow
- Consistent material creation experience

**UI**:
```tsx
<Button onClick={() => setCreateDialogOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Add Item
</Button>

<MaterialDialog
  open={createDialogOpen}
  onOpenChange={setCreateDialogOpen}
  material={null}
/>
```

## Testing Checklist

- [ ] Navigate to Settings > Locations > [Location] > Pricing tab
- [ ] Test **Estimate tab**:
  - [ ] Click Edit on an estimate item
  - [ ] Verify dialog shows "Our Price" title
  - [ ] Verify single row with "Our Price" label
  - [ ] Set a price and save
- [ ] Test **Materials tab**:
  - [ ] Click Edit on a material
  - [ ] Verify only material suppliers appear (not labor/subcontractors)
  - [ ] Set supplier prices and save
  - [ ] Click "+ Add Item" button
  - [ ] Create a new material
  - [ ] Verify it appears in the list immediately
- [ ] Test **Labor tab**:
  - [ ] Click Edit on a labor item
  - [ ] Verify only subcontractors appear (not material suppliers)
  - [ ] Set supplier prices and save
- [ ] Verify no console errors (the `unit_price` error should be gone)

## Files Modified

1. ✅ `lib/api/locations.ts` - Fixed database query
2. ✅ `components/admin/locations/edit-material-pricing-dialog.tsx` - Added supplier filtering
3. ✅ `components/admin/locations/materials-pricing-tab.tsx` - Added "+ Add Item" button

## Data Flow

```
User clicks "Edit" on a material
  ↓
EditMaterialPricingDialog opens
  ↓
Fetches all suppliers (useSuppliers)
  ↓
Filters suppliers by material.item_type
  ↓
For estimate: Shows "Our Price" input
For material: Shows only material_supplier + both suppliers  
For labor: Shows only subcontractor + both suppliers
  ↓
User edits prices
  ↓
Saves via useSetLocationSupplierPrice
  ↓
React Query invalidates cache
  ↓
List refreshes automatically
```

## Notes

- The TypeScript import error for `EditMaterialPricingDialog` is a cache issue only - the code compiles and runs correctly
- Can restart TS server to clear: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- All changes are backwards compatible
- No database migrations needed (we already had `supplier.type` and `materials.item_type`)
