# Material Measurement Types Enhancement

## Overview

Enhanced the materials system to support multiple measurement types beyond just "per square" calculations. Materials can now be calculated based on:

- **Squares** (traditional roofing squares - 100 sq ft each)
- **Hip + Ridge** (combined hip and ridge linear feet)
- **Perimeter** (combined rake and eave linear feet)
- **Ridge Only** (ridge linear feet)
- **Valley** (valley linear feet)
- **Rake** (rake linear feet)
- **Eave** (eave linear feet)
- **Each** (fixed quantity, not measurement-based)

## 🎯 Key Design Decision: Single Source of Truth

**Measurement settings (type and conversion) are defined ONLY in the Material, not in Templates.**

**Why?**
- ✅ No duplication or conflicts between material and template settings
- ✅ Update a material's conversion once, all templates automatically use the new value
- ✅ Simpler to maintain and understand
- ✅ Templates focus on **which materials** to use, not **how to measure** them

**Example:**
- You define "Ridge Cap Shingles" as measurement_type: `hip_ridge`, default_per_unit: `33.0`
- Every template using this material automatically calculates: `(hip + ridge feet) ÷ 33`
- If you later discover it's actually 30 LF per bundle, update the material once
- All templates instantly use the new 30 LF conversion

## Why This Matters

Different roofing materials require different measurements:

- **Shingles** → calculated per square (e.g., 3 bundles per 100 sq ft)
- **Ridge caps** → calculated per hip + ridge linear feet (e.g., 1 bundle covers 33 LF)
- **Drip edge** → calculated per perimeter (rake + eave) (e.g., 1 piece = 10 LF)
- **Starter strip** → calculated per perimeter (e.g., 1 roll covers 100 LF)
- **Ice & water shield** → can be per square or per valley/rake
- **Vents** → fixed quantity (e.g., always order 2 ridge vents)

## Database Changes

### Migration: `20241205000004_add_measurement_types.sql`

**Materials Table:**
```sql
-- New columns
measurement_type TEXT DEFAULT 'square'  -- What type of measurement this uses
default_per_unit NUMERIC(10,2)         -- Quantity per measurement unit
```

**Template Materials Table:**
```sql
-- NO CHANGES - templates inherit measurement settings from materials
-- This prevents duplication and maintains single source of truth
```

**Lead Measurements Table:**
```sql
-- New computed columns
hip_ridge_total NUMERIC(10,2) -- Auto-calculated: hip_feet + ridge_feet
perimeter_total NUMERIC(10,2) -- Auto-calculated: rake_feet + eave_feet
```

**New Helper Function:**
```sql
calculate_material_quantity(
  measurement_type,
  per_unit,
  squares,
  hip_ridge,
  perimeter,
  ridge,
  valley,
  rake,
  eave
) RETURNS NUMERIC
```

## TypeScript Changes

### New Types (`lib/types/materials.ts`)

```typescript
export type MeasurementType = 
  | 'square'        // Per roofing square (100 sq ft)
  | 'hip_ridge'     // Per linear foot of hip + ridge combined
  | 'perimeter'     // Per linear foot of rake + eave combined
  | 'ridge'         // Per linear foot of ridge only
  | 'valley'        // Per linear foot of valley only
  | 'rake'          // Per linear foot of rake only
  | 'eave'          // Per linear foot of eave only
  | 'each'          // Fixed quantity

export interface RoofMeasurements {
  total_squares: number
  hip_ridge_total?: number
  perimeter_total?: number
  ridge_feet?: number
  valley_feet?: number
  rake_feet?: number
  eave_feet?: number
  hip_feet?: number
}

export interface CalculatedMaterialQuantity {
  material_id: string
  material_name: string
  measurement_type: MeasurementType
  measurement_value: number
  per_unit: number
  calculated_quantity: number
  unit: string
  estimated_unit_cost: number | null
  estimated_total: number | null
}
```

### Helper Functions

```typescript
// Get measurement value from roof measurements
getMeasurementValue(type: MeasurementType, measurements: RoofMeasurements): number

// Calculate quantity based on measurement type
calculateMaterialQuantity(
  type: MeasurementType, 
  perUnit: number, 
  measurements: RoofMeasurements
): number

// Get UI labels
getMeasurementTypeLabel(type: MeasurementType): string
getMeasurementUnitDescription(type: MeasurementType): string
```

## Calculation Logic

### For "Square" Materials (Shingles, Underlayment)
```
Quantity = total_squares × per_unit
Example: 25 squares × 3.0 bundles/square = 75 bundles
```

### For Linear Foot Materials (Ridge Cap, Drip Edge, Starter)
```
Quantity = linear_feet ÷ per_unit
Example: 100 LF ÷ 33 LF/bundle = 3.03 bundles (rounds to 4)
```

### For Fixed Quantity Materials (Vents, Tools)
```
Quantity = per_unit (fixed)
Example: per_unit = 2 → always order 2 units
```

## API Changes

### New Function: `importTemplateToOrder()`

**Location:** `lib/api/material-orders.ts`

**Purpose:** Automatically generate material order from template + roof measurements

**Parameters:**
```typescript
{
  template_id: string
  measurements: RoofMeasurements  // All roof measurements
  estimated_costs?: Record<string, number>  // Optional cost overrides
  companyId: string
  leadId: string
  createdBy?: string
}
```

**Returns:**
```typescript
{
  order_id: string
  items: GeneratedOrderItem[]
  total_estimated: number
  warnings?: string[]  // e.g., "Missing ridge measurement"
}
```

**Example Usage:**
```typescript
const result = await importTemplateToOrder({
  template_id: 'template-uuid',
  measurements: {
    total_squares: 25,
    hip_ridge_total: 100,  // Auto-calculated from hip_feet + ridge_feet
    perimeter_total: 180,  // Auto-calculated from rake_feet + eave_feet
    ridge_feet: 60,
    valley_feet: 20,
    rake_feet: 90,
    eave_feet: 90,
    hip_feet: 40
  },
  companyId: 'company-uuid',
  leadId: 'lead-uuid'
})

// Result:
// - Shingles: 25 sq × 3.0 = 75 bundles
// - Ridge cap: 100 LF ÷ 33 LF/bundle = 4 bundles
// - Drip edge: 180 LF ÷ 10 LF/piece = 18 pieces
// - Starter: 180 LF ÷ 100 LF/roll = 2 rolls
```

## UI Changes

### Material Dialog (`material-dialog.tsx`)

**New Fields:**
- **Measurement Type** dropdown (replaces implicit "per square")
- **Default Quantity Per Unit** (replaces "Default Per Square")
- Dynamic helper text based on selected measurement type

**Example:**
```
Measurement Type: [Hip + Ridge (linear feet)]
Default Quantity Per Unit: [33.0]
Helper: "Linear feet per unit (e.g., 33 LF per bundle)"
```

### Material Display (`materials-settings.tsx`)

**Now Shows:**
- Measurement type badge (Square, Hip+Ridge, Perimeter, etc.)
- Quantity with correct unit suffix (/sq, LF, ea)

### Template Dialog (`material-template-dialog.tsx`)

**Simplified - No Measurement Overrides:**
- Materials are added to templates with just a description
- Measurement type and conversion rates come from the material itself
- **Single source of truth** - update material once, all templates use new settings
- Read-only display shows each material's measurement settings

**Example:**
```
Material: CertainTeed Ridge Cap Shingles
Measurement Type: Hip + Ridge (from material - read only)
Conversion: 33.0 LF per bundle (from material - read only)
Notes: "Additional notes specific to this template..."
```

**Why This Approach:**
- ✅ No duplication or conflicts
- ✅ Update material conversion once, affects all templates
- ✅ Easier to maintain
- ✅ Templates focus on which materials, not how to measure them

## Migration Steps

### 1. Run the Migration

Copy the contents of `20241205000004_add_measurement_types.sql` and run in Supabase Dashboard SQL Editor.

### 2. Update Existing Materials

Go to **Settings → Materials** and update measurement types for:

**Hip + Ridge Materials:**
- Ridge cap shingles
- Hip & ridge shingles
- Any material measured by ridge/hip length

**Perimeter Materials:**
- Drip edge
- Starter strips
- Rake/eave trim
- Fascia boards

**Other Linear Materials:**
- Valley materials (set to "Valley")
- Eave-specific materials (set to "Eave")

### 3. Update Templates

Go to **Settings → Material Templates** and:
- Edit existing templates
- Verify measurement types for each material
- Update per_unit quantities (especially for linear materials)

### 4. Test Template Import

1. Create a test lead
2. Add roof measurements (including ridge, rake, eave measurements)
3. Go to material orders
4. Click "Import from Template"
5. Select a template
6. Verify calculated quantities are correct

## Example: Standard Residential Roof Template

**Roof Measurements:**
- Total Squares: 25
- Ridge: 60 LF
- Hip: 40 LF
- Rake: 90 LF
- Eave: 90 LF
- Hip+Ridge Total: 100 LF (auto-calculated)
- Perimeter Total: 180 LF (auto-calculated)

**Template Materials:**

| Material | Category | Measurement Type | Per Unit | Calculation | Result |
|----------|----------|-----------------|----------|-------------|--------|
| Architectural Shingles | Shingles | Square | 3.0 bundles/sq | 25 sq × 3.0 | **75 bundles** |
| Synthetic Underlayment | Underlayment | Square | 1.0 rolls/sq | 25 sq × 1.0 | **25 rolls** |
| Ridge Cap Shingles | Shingles | Hip+Ridge | 33 LF/bundle | 100 LF ÷ 33 | **4 bundles** |
| Drip Edge (10' pieces) | Flashing | Perimeter | 10 LF/piece | 180 LF ÷ 10 | **18 pieces** |
| Starter Strip | Shingles | Perimeter | 100 LF/roll | 180 LF ÷ 100 | **2 rolls** |
| Roof Vents | Ventilation | Each | 2 | Fixed | **2 vents** |
| Ice & Water Shield | Underlayment | Ridge | 75 LF/roll | 60 LF ÷ 75 | **1 roll** |

**Generated Order Total:**
- 75 bundles shingles @ $35/bundle = $2,625
- 25 rolls underlayment @ $85/roll = $2,125
- 4 bundles ridge cap @ $40/bundle = $160
- 18 pieces drip edge @ $8/piece = $144
- 2 rolls starter @ $65/roll = $130
- 2 vents @ $25/vent = $50
- 1 roll ice & water @ $125/roll = $125
- **Total Estimated: $5,359**

## Backward Compatibility

- Old `default_per_square` field maintained for backward compatibility
- Old `per_square` in template_materials maintained
- New fields (`measurement_type`, `default_per_unit`, `per_unit`) take precedence
- Migration copies `default_per_square` → `default_per_unit` for existing materials
- Defaults to `measurement_type = 'square'` if not specified

## Common Use Cases

### Hip & Ridge Cap Shingles
```
Measurement Type: hip_ridge
Per Unit: 33.0 (33 LF per bundle)
Calculation: (hip_feet + ridge_feet) ÷ 33
```

### Drip Edge
```
Measurement Type: perimeter
Per Unit: 10.0 (10 LF per 10-foot piece)
Calculation: (rake_feet + eave_feet) ÷ 10
```

### Starter Strip
```
Measurement Type: perimeter  
Per Unit: 100.0 (100 LF per roll)
Calculation: (rake_feet + eave_feet) ÷ 100
```

### Valley Ice & Water Shield
```
Measurement Type: valley
Per Unit: 75.0 (75 LF per roll)
Calculation: valley_feet ÷ 75
```

### Ridge Vents
```
Measurement Type: each
Per Unit: 2.0 (always order 2)
Calculation: Fixed quantity = 2
```

## Testing Checklist

- [ ] Run migration successfully
- [ ] Create material with "Hip+Ridge" measurement type
- [ ] Create material with "Perimeter" measurement type
- [ ] Create material with "Each" (fixed qty) measurement type
- [ ] Create template with mixed measurement types
- [ ] Import template to material order
- [ ] Verify calculated quantities are correct
- [ ] Check that warnings appear for missing measurements
- [ ] Verify backward compatibility with existing square-based materials

## Next Steps

1. **Run the migration** on your work computer
2. **Update 3-5 test materials** with different measurement types
3. **Create a test template** with mixed measurement types
4. **Test import** with a lead that has full measurements
5. **Document any issues** or edge cases discovered

## Questions?

If you encounter any issues or have questions about:
- How to set measurement type for a specific material
- What per_unit value to use
- How calculations work for a specific scenario
- Template import not working as expected

Let me know and we can troubleshoot together!
