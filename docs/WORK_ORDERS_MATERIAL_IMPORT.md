# Work Order Material Import Feature

## Overview
Added ability to import line items from the materials database and material templates when editing work orders.

## Implementation Date
December 7, 2024

## Features Added

### 1. **Browse Materials Database**
- New "From Materials" button in Edit Work Order dialog
- Search and filter materials by name, category, or manufacturer
- Click any material to add it as a line item
- Automatically sets:
  - Item type (materials/other based on category)
  - Description (material name + manufacturer)
  - Unit (from material master)
  - Unit price (from material current_cost)
  - Notes (SKU if available)

### 2. **Import from Templates**
- New "From Template" button in Edit Work Order dialog
- Browse all active material templates
- Click any template to import ALL items from that template
- Automatically creates line items for each template item
- Sets quantity from template's per_square value
- Marks items with "From template: {template name}" in notes

### 3. **Enhanced UI**
- Three action buttons now available:
  1. **From Materials** - Browse materials database
  2. **From Template** - Import from template
  3. **Add Item** - Manual entry (existing)
- Search functionality in materials browser
- Clean, filterable material list with pricing
- Template browser showing item count and category

## Technical Details

### New Hooks Used
```typescript
const { data: materialsResponse } = useMaterials({ is_active: true })
const { data: templatesResponse } = useTemplates({ is_active: true })
```

### Material Import Function
```typescript
const handleImportMaterial = (material: Material) => {
  // Determines item type based on category
  // Creates line item with material details
  // Pre-fills price from current_cost
  // Adds SKU to notes if available
}
```

### Template Import Function
```typescript
const handleImportTemplate = (template: MaterialTemplate) => {
  // Imports ALL items from template
  // Creates multiple line items
  // Sets quantities from template
  // Marks source in notes
}
```

## User Workflow

### Importing a Material
1. Click "Edit" on work order card
2. Scroll to Line Items section
3. Click "From Materials" button
4. Use search to find material (optional)
5. Click on desired material
6. Material added as line item automatically
7. Adjust quantity/price if needed

### Importing from Template
1. Click "Edit" on work order card
2. Scroll to Line Items section
3. Click "From Template" button
4. Browse available templates
5. Click on desired template
6. All template items added as line items
7. Fill in prices and adjust quantities as needed

## Material Browser Features
- **Real-time search** across name, category, manufacturer
- **Visual display** shows:
  - Material name (bold)
  - Manufacturer • Category • Unit • SKU
  - Current price
  - Category badge
- **Click to add** - Single click imports material
- **Scrollable list** - Handles large material catalogs

## Template Browser Features
- **Template cards** showing:
  - Template name
  - Description
  - Category badge
  - Item count
- **Click to import** - Imports entire template at once
- **Bulk import** - Adds multiple items in one action

## Benefits

### For Users
✅ **Faster data entry** - No typing material names manually  
✅ **Consistent naming** - Uses master material names  
✅ **Accurate pricing** - Pulls current costs from database  
✅ **Bulk operations** - Import entire templates at once  
✅ **Searchable** - Find materials quickly  

### For Data Quality
✅ **Standardized items** - All materials from single source  
✅ **Price accuracy** - Always uses latest material costs  
✅ **SKU tracking** - Preserves material SKUs in notes  
✅ **Audit trail** - Notes show source (template name)  

## Files Modified

### `components/admin/leads/edit-work-order-dialog.tsx`
**Changes**:
- Added imports for `useMaterials` and `useTemplates` hooks
- Added `Material` and `MaterialTemplate` type imports
- Added state variables:
  - `showMaterialBrowser` - Controls material browser dialog
  - `showTemplateBrowser` - Controls template browser dialog
  - `materialSearchQuery` - Search filter for materials
- Added data fetching:
  - Fetches active materials
  - Fetches active templates
  - Filters materials by search query
- Added import functions:
  - `handleImportMaterial()` - Imports single material
  - `handleImportTemplate()` - Imports all items from template
- Updated UI:
  - Changed "Add Item" button to button group
  - Added "From Materials" button
  - Added "From Template" button
- Added two new dialogs:
  - Material Browser Dialog (searchable list)
  - Template Browser Dialog (clickable cards)

**Lines Added**: ~180 lines

## Database Integration

### Materials Table
The implementation uses the existing `materials` table:
```sql
SELECT 
  id, name, category, manufacturer, 
  unit, current_cost, sku, is_active
FROM materials
WHERE company_id = :company_id 
  AND is_active = true
  AND deleted_at IS NULL
```

### Material Templates Table
Uses existing `material_templates` table:
```sql
SELECT 
  id, name, description, category, 
  items, is_active
FROM material_templates
WHERE company_id = :company_id 
  AND is_active = true
  AND deleted_at IS NULL
```

## Example Use Cases

### Case 1: Roofing Job
1. Edit work order
2. Click "From Template"
3. Select "Standard Roof Replacement"
4. Template imports:
   - Shingles (30 bundles)
   - Underlayment (15 rolls)
   - Drip edge (200 linear feet)
   - Ridge cap (50 linear feet)
   - Nails (5 boxes)
5. Adjust quantities based on actual measurements
6. All items retain template source in notes

### Case 2: Specialty Material
1. Edit work order
2. Click "From Materials"
3. Search for "ice and water shield"
4. Click on "Grace Ice & Water Shield"
5. Material added with:
   - Name: Grace Ice & Water Shield - Grace
   - Unit: roll
   - Price: $45.00 (from material master)
   - Notes: SKU: GCP-12345
6. Adjust quantity to 3 rolls

### Case 3: Mixed Entry
1. Add specialty materials from Materials browser
2. Import common items from template
3. Manually add custom labor items
4. Result: Complete work order with mixed sources

## Future Enhancements

### Phase 2 Ideas
- [ ] Quick add frequently used materials
- [ ] Material favorites/bookmarks
- [ ] Recent materials list
- [ ] Material quantity calculator based on measurements
- [ ] Template customization before import
- [ ] Preview template items before importing
- [ ] Drag and drop material ordering
- [ ] Material substitution suggestions

### Phase 3 Ideas
- [ ] Material availability checking
- [ ] Supplier integration for real-time pricing
- [ ] Material order generation from work order
- [ ] Inventory deduction on work order completion
- [ ] Material waste tracking
- [ ] Cost variance reporting (estimated vs actual)

## Testing Checklist

### Material Import
- [x] Browse materials dialog opens
- [x] Search filters materials correctly
- [x] Click material adds line item
- [x] Material price populates correctly
- [x] Material unit populates correctly
- [x] SKU appears in notes
- [x] Dialog closes after selection
- [x] Toast notification appears

### Template Import
- [x] Browse templates dialog opens
- [x] Template list displays correctly
- [x] Click template imports all items
- [x] Item count matches template
- [x] Template name in notes
- [x] Dialog closes after import
- [x] Toast shows item count

### Edge Cases
- [x] Empty materials list (shows "No materials found")
- [x] Empty templates list (shows "No templates found")
- [x] Material with no price (sets to 0)
- [x] Material with no SKU (no note added)
- [x] Template with no items (imports 0 items)
- [x] Search with no results (shows "No materials found")
- [x] Multiple imports (appends to existing items)

## Conclusion

The work order edit dialog now has **full parity with material order creation** in terms of material/template import capabilities. Users can:

✅ Browse and search the materials database  
✅ Import single materials with one click  
✅ Import entire templates at once  
✅ Mix manual entry with database imports  
✅ Maintain data consistency and accuracy  

This feature significantly improves data entry speed and accuracy for work order line items.
