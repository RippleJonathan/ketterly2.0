# Estimate Template System Implementation

## Overview
Created a complete estimate template system that mirrors the existing material/labor order template system. Users can create reusable templates to quickly populate estimates with pre-configured line items.

---

## What Was Created

### 1. Database Migration
**File:** `supabase/migrations/20241217000001_add_estimate_templates.sql`

Created two tables:
- `estimate_templates` - Main template table with name, description, category
- `template_estimate_items` - Junction table linking templates to materials with per-square quantities

Features:
- ✅ Full RLS policies for multi-tenant isolation
- ✅ Soft deletes via `deleted_at` column
- ✅ Auto-updated `updated_at` timestamps
- ✅ Helper view `estimate_template_calculations` for easy querying
- ✅ Proper indexes on company_id, category, template_id, material_id

Categories: `roofing`, `siding`, `windows`, `gutters`, `repairs`, `other`

### 2. TypeScript Types
**File:** `lib/types/estimate-templates.ts`

Exported types:
- `EstimateTemplate` - Main template interface
- `EstimateTemplateCategory` - Union type for categories
- `TemplateEstimateItem` - Junction table item
- `TemplateEstimateItemWithMaterial` - Item with joined material data
- `EstimateTemplateWithItems` - Full template with all items
- `EstimateTemplateInsert` - Insert payload
- `EstimateTemplateUpdate` - Update payload
- `TemplateEstimateItemInsert` - Item insert payload
- `TemplateEstimateItemUpdate` - Item update payload
- `EstimateTemplateCalculation` - Helper view type

### 3. API Functions
**File:** `lib/api/estimate-templates.ts`

Complete API layer:
- `getEstimateTemplates(companyId, filters?)` - Get all templates with optional category filter
- `getEstimateTemplate(templateId)` - Get single template with all items
- `createEstimateTemplate(template)` - Create new template
- `updateEstimateTemplate(templateId, updates)` - Update template
- `deleteEstimateTemplate(templateId)` - Soft delete template
- `getTemplateEstimateItems(templateId)` - Get all items for template
- `addMaterialToEstimateTemplate(item)` - Add single material
- `bulkAddMaterialsToEstimateTemplate(templateId, materials)` - Add multiple materials
- `updateTemplateEstimateItem(itemId, updates)` - Update item
- `removeMaterialFromEstimateTemplate(itemId)` - Remove material
- `reorderTemplateEstimateItems(items)` - Reorder items by sort_order
- `getEstimateTemplateCalculations(companyId, templateId?)` - Query helper view

All functions:
- ✅ Return `ApiResponse<T>` with proper error handling
- ✅ Filter by `company_id` for tenant isolation
- ✅ Use `.is('deleted_at', null)` for soft delete filtering

### 4. React Query Hooks
**File:** `lib/hooks/use-estimate-templates.ts`

Custom hooks:
- `useEstimateTemplates(filters?)` - Query all templates
- `useEstimateTemplate(templateId)` - Query single template
- `useCreateEstimateTemplate()` - Mutation to create
- `useUpdateEstimateTemplate()` - Mutation to update
- `useDeleteEstimateTemplate()` - Mutation to soft delete
- `useTemplateEstimateItems(templateId)` - Query template items
- `useAddMaterialToEstimateTemplate()` - Mutation to add single material
- `useBulkAddMaterialsToEstimateTemplate()` - Mutation to add multiple materials
- `useUpdateTemplateEstimateItem()` - Mutation to update item
- `useRemoveMaterialFromEstimateTemplate()` - Mutation to remove material
- `useReorderTemplateEstimateItems()` - Mutation to reorder items
- `useEstimateTemplateCalculations(templateId?)` - Query calculations view

All mutations:
- ✅ Invalidate React Query cache on success
- ✅ Show success/error toasts
- ✅ Auto-refresh UI data

### 5. UI Components

#### Estimate Template Dialog
**File:** `components/admin/settings/estimate-template-dialog.tsx`

Full-featured dialog for creating/editing templates:
- Form with name, description, category fields
- Material picker (select from active materials catalog)
- Shows measurement type and conversion rate (read-only, inherited from material)
- Optional description field per line item
- Different UX for create vs edit mode:
  - **Create:** Select materials, they're added on submit
  - **Edit:** Can add/remove materials immediately

Features:
- ✅ Zod validation with react-hook-form
- ✅ Material search and selection
- ✅ Displays material metadata (category, manufacturer, measurement type, conversion)
- ✅ Add/remove materials
- ✅ Real-time updates when editing
- ✅ Responsive layout with Tailwind
- ✅ Loading states and error handling

#### Estimate Templates Settings Page
**File:** `components/admin/settings/estimate-templates-settings.tsx`

Settings page for managing all templates:
- List view grouped by category
- Each category shows count badge
- Card layout for each template
- Edit/delete buttons per template
- Empty state with call-to-action
- Delete confirmation dialog

Features:
- ✅ Category grouping (Roofing, Siding, Windows, Gutters, Repairs, Other)
- ✅ Create new template button
- ✅ Edit existing template
- ✅ Delete with confirmation
- ✅ Loading states
- ✅ Empty state UX

---

## How It Works (Same as Material Templates)

### 1. Create Template
1. Admin goes to Settings → Estimate Templates
2. Clicks "Create Template"
3. Enters name, category, optional description
4. Searches and selects materials from catalog
5. Materials automatically inherit:
   - Measurement type (square, hip_ridge, perimeter, each)
   - Conversion rate (default_per_square or default_per_unit)
   - Unit (bundle, roll, box, etc.)
   - Current cost
6. Can add optional notes per line item
7. Saves template with all items

### 2. Edit Template
1. Click edit on existing template
2. Can change name, description, category
3. Can add new materials from catalog
4. Can remove existing materials
5. Material settings (measurement type, conversion) come from materials table

### 3. Use in Estimates (Future)
When creating an estimate:
1. Click "Import from Template"
2. Select template (filtered by category)
3. Enter roof measurements (squares, hip/ridge LF, perimeter LF)
4. System auto-calculates quantities:
   - Per Square materials: quantity = squares × per_square
   - Hip/Ridge materials: quantity = hip_ridge_lf × per_square
   - Perimeter materials: quantity = perimeter_lf × per_square
   - Fixed materials: quantity = per_square (fixed amount)
5. All line items added to estimate with calculated quantities and pricing

---

## Next Steps

### To Complete the Feature:

1. **Run Database Migration**
   ```bash
   # Copy migration file to Supabase Dashboard SQL Editor
   # File: supabase/migrations/20241217000001_add_estimate_templates.sql
   # Run in dashboard to create tables and RLS policies
   ```

2. **Add to Settings Navigation**
   Add "Estimate Templates" link in settings sidebar (similar to Material Templates)

3. **Integrate with Estimate Builder**
   Create "Import from Template" functionality in estimate creation flow:
   - Button in estimate builder
   - Template selector dialog
   - Measurement input form
   - Quantity calculation logic
   - Add line items to estimate

4. **Test End-to-End**
   - Create template with materials
   - Import template into estimate
   - Verify quantities calculate correctly
   - Verify pricing pulls from current_cost
   - Test all measurement types (square, hip_ridge, perimeter, each)

---

## Files Changed/Created

### Created:
1. `supabase/migrations/20241217000001_add_estimate_templates.sql`
2. `lib/types/estimate-templates.ts`
3. `lib/api/estimate-templates.ts`
4. `lib/hooks/use-estimate-templates.ts`
5. `components/admin/settings/estimate-template-dialog.tsx`
6. `components/admin/settings/estimate-templates-settings.tsx`

### Modified:
1. `app/globals.css` - Added Google Maps autocomplete z-index fix

---

## Database Schema

### estimate_templates
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| company_id | UUID | Foreign key to companies |
| name | TEXT | Template name |
| description | TEXT | Optional description |
| category | TEXT | roofing, siding, windows, gutters, repairs, other |
| created_at | TIMESTAMPTZ | Auto-set on create |
| updated_at | TIMESTAMPTZ | Auto-updated |
| deleted_at | TIMESTAMPTZ | Soft delete timestamp |

### template_estimate_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| template_id | UUID | Foreign key to estimate_templates |
| material_id | UUID | Foreign key to materials |
| per_square | NUMERIC | Quantity per square (or per LF/fixed) |
| description | TEXT | Optional line item notes |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMPTZ | Auto-set on create |

---

## Key Design Decisions

1. **Reuse Materials Table**: Don't duplicate material data - use existing `materials` table
2. **Measurement Types on Materials**: Templates inherit measurement logic from materials
3. **Per-Square in Junction**: `per_square` can be overridden per template, but defaults to material's default
4. **Calculations at Runtime**: Don't store calculated quantities - compute from measurements when importing
5. **Same Pattern as Material Templates**: Exact mirror for consistency
6. **Multi-Tenant by Default**: All queries filter by company_id via RLS

---

## Testing Checklist

- [ ] Run migration in Supabase Dashboard
- [ ] Verify tables created with proper RLS policies
- [ ] Add navigation link to settings
- [ ] Create template with multiple materials
- [ ] Edit template name/description
- [ ] Add material to existing template
- [ ] Remove material from template
- [ ] Delete template (verify soft delete)
- [ ] Verify templates filtered by company_id
- [ ] Test all measurement types:
  - [ ] Per Square (shingles)
  - [ ] Hip + Ridge (ridge cap)
  - [ ] Perimeter (drip edge, ice & water)
  - [ ] Fixed (vents, boots)
- [ ] Integrate with estimate builder
- [ ] Test import with real measurements
- [ ] Verify quantity calculations
- [ ] Verify pricing pulls current_cost

---

## Bug Fixes Included

### Address Autocomplete Z-Index Fix
**Problem:** Google Maps autocomplete suggestions appeared but weren't clickable in dialog
**Solution:** Added CSS to `app/globals.css`:
```css
.pac-container {
  z-index: 99999 !important;
}
```

Now autocomplete dropdown appears above dialog overlay and is fully clickable.

---

**Status:** ✅ Core system complete, ready for database migration and testing
**Next:** Run migration → Add nav link → Test → Integrate with estimate builder
