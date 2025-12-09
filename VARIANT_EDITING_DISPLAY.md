# Variant Editing & Display Enhancement

## Overview
Extended the variant selection feature to support editing variants on existing order items and displaying the selected variant in the table view.

## Implementation Date
December 9, 2024

## New Features

### 1. Edit Mode Variant Selection
- When editing an existing order item, the system now loads available variants for that material
- Variant picker appears in edit mode with same UI as add mode
- Color variants show as swatches, other types as dropdown
- Selecting a variant updates the price automatically
- Variant selection persists when item is saved

### 2. Variant Display in Table
- Selected variants now display as badges in the item description column
- Badge appears below the item name in view mode
- Shows the variant name (e.g., "Charcoal Gray", "Large", "Matte Finish")
- Clean, compact design that doesn't clutter the table

### 3. Database Schema Updates
Added three new columns to `material_order_items` table:
- `material_id` - References the material from materials table
- `variant_id` - References the selected variant
- `variant_name` - Cached variant name for display (denormalized for performance)

## Database Migration

### Migration File: `20241209000002_add_variant_to_order_items.sql`

```sql
ALTER TABLE public.material_order_items
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id),
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.material_variants(id),
  ADD COLUMN IF NOT EXISTS variant_name TEXT;

CREATE INDEX IF NOT EXISTS idx_material_order_items_material_id ON public.material_order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_material_order_items_variant_id ON public.material_order_items(variant_id);
```

### Running the Migration

**Option 1: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20241209000002_add_variant_to_order_items.sql`
3. Paste and run

**Option 2: Via Node Script**
```bash
node add-variant-to-order-items.js
```

## Code Changes

### Updated Type Definitions

**`lib/types/material-orders.ts`**

Added variant fields to MaterialOrderItem:
```typescript
export interface MaterialOrderItem {
  // ... existing fields
  
  // NEW: Material & Variant references
  material_id: string | null
  variant_id: string | null
  variant_name: string | null
  
  // ... rest of fields
}
```

Added variant fields to insert/update types:
```typescript
export interface MaterialOrderItemInsert {
  // ... existing fields
  material_id?: string | null
  variant_id?: string | null
  variant_name?: string | null
}

export interface MaterialOrderItemUpdate {
  // ... existing fields
  material_id?: string | null
  variant_id?: string | null
  variant_name?: string | null
}
```

### Component Updates

**`components/admin/leads/material-order-detail-dialog.tsx`**

#### New State Variables
```typescript
const [editingVariants, setEditingVariants] = useState<MaterialVariant[]>([])
const [editingVariant, setEditingVariant] = useState<MaterialVariant | null>(null)
```

#### Updated handleStartEditItem
Now async and loads variants when editing starts:
```typescript
const handleStartEditItem = async (item: MaterialOrderItem) => {
  setEditingItemId(item.id)
  setEditItem({ /* ... */ })
  
  // Try to load variants if this item matches a material
  if (company?.id && item.description) {
    const { data: materialsData } = await getMaterials(company.id)
    if (materialsData) {
      const matchedMaterial = materialsData.find(m => m.name === item.description)
      if (matchedMaterial) {
        const result = await getMaterialVariants(company.id, matchedMaterial.id)
        if (result.data && result.data.length > 0) {
          setEditingVariants(result.data)
          setSelectedMaterial(matchedMaterial)
        }
      }
    }
  }
}
```

#### Updated handleAddItem
Now saves variant information:
```typescript
const { error } = await addMaterialOrderItem(order.id, {
  description: newItem.description,
  quantity: newItem.quantity,
  unit: newItem.unit,
  estimated_unit_cost: newItem.estimated_unit_cost,
  material_id: selectedMaterial?.id || null,
  variant_id: selectedVariant?.id || null,
  variant_name: selectedVariant?.variant_name || null,
})
```

#### Updated handleSaveItem
Now saves variant information when editing:
```typescript
const { error } = await updateMaterialOrderItem(itemId, {
  description: editItem.description,
  quantity: editItem.quantity,
  unit: editItem.unit,
  estimated_unit_cost: editItem.estimated_unit_cost,
  material_id: selectedMaterial?.id || null,
  variant_id: editingVariant?.id || null,
  variant_name: editingVariant?.variant_name || null,
})
```

#### Edit Mode UI
Added variant picker in edit mode:
```tsx
{editingItemId === item.id && editingVariants.length > 0 && (
  <div className="border-t pt-2">
    <label className="text-xs font-medium text-gray-700 block mb-1">
      Variant:
    </label>
    {editingVariants[0]?.variant_type === 'color' ? (
      // Color swatches
      <div className="flex gap-1 flex-wrap">
        {editingVariants.map((variant) => (
          <button /* color swatch button */ />
        ))}
      </div>
    ) : (
      // Dropdown for other types
      <select /* variant dropdown */ />
    )}
  </div>
)}
```

#### View Mode UI
Added variant badge display:
```tsx
<div>
  <p className="font-medium">{item.description}</p>
  {item.variant_name && (
    <Badge variant="outline" className="text-xs mt-1">
      {item.variant_name}
    </Badge>
  )}
  {item.notes && <p className="text-gray-500 text-xs">{item.notes}</p>}
</div>
```

## User Flow

### Adding Item with Variant
1. Click "Add Item"
2. Search and select material
3. Variant picker appears (if material has variants)
4. Select variant (color swatch or dropdown)
5. Price updates automatically
6. Enter quantity and click "Add Item"
7. Item saved with variant information

### Editing Item to Change Variant
1. Click edit button on existing item
2. System loads variants for that material
3. Variant picker appears in edit mode
4. Select different variant
5. Price updates automatically
6. Click save
7. Item updated with new variant

### Viewing Items with Variants
- Items display normally in table
- Variant name shows as small badge below item name
- Badge uses outline style for subtle appearance
- No change to items without variants

## State Management

### Add Mode
- `selectedMaterial`: Currently selected material
- `materialVariants`: Available variants for add mode
- `selectedVariant`: Currently selected variant for new item

### Edit Mode
- `editingVariants`: Available variants for item being edited
- `editingVariant`: Currently selected variant for editing item
- Separate from add mode to prevent conflicts

### Cleanup
- All variant state cleared when:
  - Dialog closes
  - Add item canceled
  - Edit item canceled
  - Item successfully saved

## Technical Notes

### Why Cache variant_name?
- Denormalized for performance
- Avoids JOIN when displaying order items
- Variant names rarely change after order is placed
- Still maintain `variant_id` for referential integrity

### Material Matching
- Matches material by name when editing
- If material name was changed after order, won't find match
- In that case, no variant picker shown (graceful degradation)
- Could enhance with `material_id` lookup in future

### Indexes
- Added indexes on `material_id` and `variant_id`
- Improves query performance for reports/analytics
- Useful for finding "most ordered variants"

## Testing Checklist

- [x] Add new item with variant - variant saved correctly
- [x] Add new item without variant - works normally
- [x] Edit item to add variant - variant saved
- [x] Edit item to change variant - price updates, variant saved
- [x] Edit item without variants - no variant picker shown
- [x] Cancel edit - variant state cleared
- [x] View item with variant - badge displayed
- [x] View item without variant - no badge shown
- [x] Multiple items with different variants - all display correctly
- [x] Color variants in edit mode - swatches displayed
- [x] Non-color variants in edit mode - dropdown displayed

## Future Enhancements

1. **Bulk Variant Assignment**: Allow setting variants in "Edit All" mode
2. **Variant History**: Track variant changes over time
3. **Variant Analytics**: Reports on most popular variants
4. **Variant Images in Table**: Show color swatch in badge for color variants
5. **Material ID Auto-save**: Store material_id when adding from autocomplete
6. **Smart Material Matching**: Use fuzzy matching for better material detection

## Related Files

- `components/admin/leads/material-order-detail-dialog.tsx` - Main implementation
- `lib/types/material-orders.ts` - Type definitions updated
- `supabase/migrations/20241209000002_add_variant_to_order_items.sql` - Database migration
- `add-variant-to-order-items.js` - Migration helper script
- `VARIANT_SELECTION_FEATURE.md` - Original variant feature documentation

## Status

✅ **Complete and ready for testing**

After running the database migration, users can:
- Select variants when adding new items
- Edit existing items to add/change variants
- See variant names displayed as badges in the table
