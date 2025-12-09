# Material Variants System - Implementation Summary

## Overview
Added a complete material variants system to allow materials to have multiple color, size, finish, and other variations with independent pricing and SKU tracking.

## Database Schema

### Table: `material_variants`
Created migration: `supabase/migrations/20241208000001_create_material_variants.sql`

**Columns:**
- `id` (UUID, primary key)
- `company_id` (UUID, FK to companies)
- `material_id` (UUID, FK to materials with CASCADE delete)
- `variant_name` (TEXT) - Display name (e.g., "Weathered Wood", "Large")
- `variant_type` (TEXT) - Type: color, size, finish, grade, other
- `color_hex` (TEXT, nullable) - Visual color representation
- `price_adjustment` (DECIMAL) - +/- from base material cost
- `current_cost` (DECIMAL, nullable) - Absolute price override
- `sku` (TEXT, nullable) - Variant-specific SKU
- `supplier_code` (TEXT, nullable) - Variant-specific supplier code
- `is_available` (BOOLEAN) - Availability flag
- `is_default` (BOOLEAN) - Default variant for material
- `notes` (TEXT, nullable) - Additional notes
- `sort_order` (INTEGER) - Display order
- Standard: `created_at`, `updated_at`, `deleted_at`

**RLS Policies:**
- SELECT: Users can view their company's variants
- INSERT: Users can create variants for their company
- UPDATE: Users can update their company's variants
- DELETE: Users can delete their company's variants (soft delete via trigger)

**Indexes:**
- `idx_material_variants_material_id` - Fast lookup by material
- `idx_material_variants_company_id` - Fast lookup by company
- `idx_material_variants_variant_type` - Filter by variant type
- `idx_material_variants_is_available` - Filter available variants

**Triggers:**
- `update_material_variants_updated_at` - Auto-update timestamp

**Helper Function:**
- `get_variant_display_name(material_name, variant_name)` - Format display names

## TypeScript Types

### File: `lib/types/material-variants.ts`

**Exports:**
- `VariantType` - Enum: 'color' | 'size' | 'finish' | 'grade' | 'other'
- `MaterialVariant` - Full variant record
- `MaterialVariantInsert` - Insert DTO
- `MaterialVariantUpdate` - Update DTO
- `MaterialVariantFilters` - Query filters
- `getVariantPrice()` - Calculate effective price
- `formatVariantDisplayName()` - Format display names
- `VARIANT_TYPE_LABELS` - UI labels for variant types
- `COMMON_SHINGLE_COLORS` - Pre-defined shingle colors for quick selection

## API Functions

### File: `lib/api/material-variants.ts`

**CRUD Operations:**
- `getMaterialVariants()` - Get all variants for a material
- `getAllCompanyVariants()` - Get all company variants with material joins
- `getMaterialVariant()` - Get single variant by ID
- `createMaterialVariant()` - Create new variant
- `updateMaterialVariant()` - Update existing variant
- `deleteMaterialVariant()` - Soft delete variant
- `setDefaultVariant()` - Mark variant as default (unsets others)
- `getDefaultVariant()` - Get default variant for material
- `bulkCreateVariants()` - Create multiple variants at once
- `reorderVariants()` - Update sort order

**All functions:**
- Enforce company_id filtering
- Include proper error handling
- Return `{ data, error }` pattern
- Support soft deletes

## React Query Hooks

### File: `lib/hooks/use-material-variants.ts`

**Hooks:**
- `useMaterialVariants(materialId, filters?)` - Query variants for material
- `useAllCompanyVariants(filters?)` - Query all company variants
- `useMaterialVariant(variantId)` - Query single variant
- `useDefaultVariant(materialId)` - Query default variant
- `useCreateMaterialVariant()` - Mutation to create variant
- `useUpdateMaterialVariant()` - Mutation to update variant
- `useDeleteMaterialVariant()` - Mutation to delete variant
- `useSetDefaultVariant()` - Mutation to set default
- `useBulkCreateVariants()` - Mutation to bulk create
- `useReorderVariants()` - Mutation to reorder

**Features:**
- Automatic query invalidation on mutations
- Toast notifications for success/error
- Company context integration via `useCurrentCompany()`
- Optimistic updates via React Query cache

## UI Component

### File: `components/admin/settings/manage-material-variants-dialog.tsx`

**Features:**
- Two-panel layout: variant list + form
- Variant list with color swatches, pricing, and SKU display
- Create/edit form with:
  - Variant name and type selection
  - Color picker with hex input
  - Quick color palette for common shingle colors
  - Price adjustment vs absolute cost override
  - SKU and supplier code inputs
  - Availability toggle
  - Default variant toggle (create only)
  - Notes field
- Real-time effective price calculation
- Set default variant button (star icon)
- Edit/delete actions per variant
- Responsive ScrollArea for long lists
- Loading and empty states

**Common Shingle Colors:**
Pre-populated palette includes:
- Weathered Wood (#8B7355)
- Charcoal (#36454F)
- Black (#1C1C1C)
- Gray (#808080)
- Brown (#6F4E37)
- Slate (#708090)
- Terra Cotta (#E07A5F)
- Harvest Blend (#B8860B)
- Colonial Slate (#556B2F)
- Driftwood (#A0826D)

## Integration

### File: `components/admin/settings/materials-settings.tsx`

**Changes:**
- Added `ManageMaterialVariantsDialog` import
- Added `Palette` icon import
- Added state: `variantsDialogOpen`, `variantsMaterial`
- Added handler: `handleManageVariants()`
- Added "Variants" button to material cards with Palette icon
- Renders variants dialog when material is selected

## Usage Example

### 1. Run Migration
```sql
-- Run in Supabase Dashboard SQL Editor
-- Copy/paste from supabase/migrations/20241208000001_create_material_variants.sql
```

### 2. Create Variants for CertainTeed Shingles
1. Navigate to Settings > Materials
2. Find "CertainTeed Landmark Shingles" material
3. Click "Variants" button
4. Click "Add Variant"
5. Enter variant details:
   - Name: "Weathered Wood"
   - Type: Color
   - Click color swatch in Quick Colors palette
   - Price Adjustment: $0 (or set custom)
   - SKU: CT-LM-WW
   - Set as Default: ✓
6. Click "Create Variant"
7. Repeat for other colors (Charcoal, Slate, etc.)

### 3. View Variants
- Variants display in left panel with:
  - Color swatch (if color type)
  - Variant name
  - Star icon (if default)
  - Variant type label
  - Effective price calculation
  - SKU (if set)
- Click "Edit" to modify
- Click "Delete" to remove
- Click star icon to set as default

## Pricing Logic

**Price Calculation:**
```typescript
effectivePrice = variant.current_cost ?? (baseMaterialCost + variant.price_adjustment)
```

**Examples:**
- Base cost: $100, Adjustment: $10 → Effective: $110
- Base cost: $100, Adjustment: -$5 → Effective: $95
- Base cost: $100, Absolute cost: $120 → Effective: $120 (ignores adjustment)

## Future Enhancements (Phase 2)

### 1. Add variant_id to Order/Quote Line Items
```sql
ALTER TABLE material_order_items 
ADD COLUMN variant_id UUID REFERENCES material_variants(id);

ALTER TABLE quote_line_items 
ADD COLUMN variant_id UUID REFERENCES material_variants(id);
```

### 2. Variant Selector Component
Create reusable dropdown for selecting variants in:
- Material order dialogs
- Quote line item forms
- Work order creation

### 3. Display Logic Updates
Update display to show: "Material Name - Variant Name"
Example: "CertainTeed Landmark - Weathered Wood"

### 4. Default Variant Auto-Selection
When adding material to order/quote:
- Auto-select default variant if exists
- Show variant dropdown if multiple available
- Allow "No Variant" selection

### 5. Bulk Import Templates
Add preset templates for:
- CertainTeed color palette
- GAF color palette
- Owens Corning color palette
- Standard lumber sizes (2x4, 2x6, etc.)

### 6. Variant Availability Filtering
Filter variants by:
- is_available flag
- Automatic hiding of unavailable variants
- "Show Unavailable" toggle in settings

## Files Created/Modified

### Created:
1. `supabase/migrations/20241208000001_create_material_variants.sql`
2. `lib/types/material-variants.ts`
3. `lib/api/material-variants.ts`
4. `lib/hooks/use-material-variants.ts`
5. `components/admin/settings/manage-material-variants-dialog.tsx`

### Modified:
1. `components/admin/settings/materials-settings.tsx`
   - Added variant management integration
   - Added Palette icon and button
   - Added dialog state and handlers

## Testing Checklist

- [ ] Run migration in Supabase Dashboard
- [ ] Verify RLS policies with test user
- [ ] Create test material (CertainTeed shingles)
- [ ] Add 3-5 color variants
- [ ] Test price adjustment calculation
- [ ] Test absolute cost override
- [ ] Set default variant
- [ ] Edit variant details
- [ ] Delete variant (verify soft delete)
- [ ] Test variant filtering (by type, availability)
- [ ] Verify company isolation (create 2 companies, check data isolation)
- [ ] Test bulk color import with palette
- [ ] Verify mobile responsiveness

## Notes

- All operations respect company_id isolation via RLS
- Soft deletes preserve historical data
- Default variant is optional but recommended
- Price adjustments can be negative (discounts)
- Color hex is optional even for color variants
- Sort order allows custom variant ordering
- Bulk operations support quick palette imports

**Status:** ✅ Complete - Ready for migration and testing
**Next Step:** Run migration in Supabase Dashboard
