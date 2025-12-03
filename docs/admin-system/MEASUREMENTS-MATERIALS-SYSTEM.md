# Measurements & Materials System

**Status**: ✅ Complete  
**Last Updated**: December 3, 2024  
**Dependencies**: Phase 1 Lead Management

---

## Overview

The Measurements & Materials system allows users to:
1. Enter detailed roof measurements for each lead
2. Track multiple roof types (standard, two-story, low-slope)
3. Search and add accessories from a reusable materials library
4. Automatically calculate total squares with waste percentage
5. Track measurement history with user attribution

This system replaced the simple "penetrations_count" field with a sophisticated materials library that supports searchable accessories like turtle vents, dome vents, pipe jacks, etc.

---

## Database Schema

### Lead Measurements Table

```sql
CREATE TABLE public.lead_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Roof measurements
  actual_squares DECIMAL(10,2),
  waste_percentage DECIMAL(5,2) DEFAULT 10.00,
  total_squares DECIMAL(10,2), -- Auto-calculated
  
  -- Roof types
  two_story_squares DECIMAL(10,2),
  low_slope_squares DECIMAL(10,2),
  
  -- Linear measurements (feet)
  ridge_feet DECIMAL(10,2),
  valley_feet DECIMAL(10,2),
  eave_feet DECIMAL(10,2),
  rake_feet DECIMAL(10,2),
  hip_feet DECIMAL(10,2),
  
  -- Additional info
  layers_to_remove INTEGER DEFAULT 1,
  pitch_ratio TEXT, -- e.g., "6/12", "8/12"
  notes TEXT,
  
  -- Audit
  measured_by UUID REFERENCES public.users(id),
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**Key Features**:
- `total_squares` auto-calculated via trigger: `actual_squares * (1 + waste_percentage/100)`
- Supports specialized roof types (two-story, low-slope) for accurate material estimation
- Soft delete with `deleted_at`
- Full audit trail with measurer and timestamp

### Materials Library Table

```sql
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Material info
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'accessory', 'shingle', 'underlayment', 'flashing', 'labor'
  subcategory TEXT,
  
  -- Pricing
  unit_price DECIMAL(10,2),
  unit_type TEXT, -- 'each', 'linear_foot', 'square', 'roll'
  
  -- Details
  manufacturer TEXT,
  model_number TEXT,
  color TEXT,
  description TEXT,
  sku TEXT,
  
  -- Inventory (future use)
  current_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_taxable BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Full-text search index
CREATE INDEX idx_materials_search ON public.materials 
  USING gin(to_tsvector('english', name));
```

**Key Features**:
- Reusable across all leads for a company
- Full-text search on material names
- Categorized for filtering (accessories, shingles, etc.)
- Inventory tracking (ready for future warehouse features)
- Soft delete preserves historical data

### Measurement Accessories (Join Table)

```sql
CREATE TABLE public.measurement_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES public.lead_measurements(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Purpose**: Links measurements to materials with quantities. Allows multiple accessories per measurement.

### Seed Data

7 common roofing accessories are pre-seeded for all companies:

```sql
-- Turtle Vent - $8.50 each
-- Dome Vent - $12.00 each
-- 3-in-1 Pipe Jack - $15.00 each
-- Ridge Vent - $3.50/ft
-- Drip Edge - $1.50/ft
-- Ice & Water Shield - $85.00/roll
-- Synthetic Underlayment - $65.00/roll
```

---

## API Layer

### Files

- **`lib/api/measurements.ts`** - CRUD for measurements + accessories
- **`lib/api/materials.ts`** - Material search and management

### Key Functions

#### Measurements API

```typescript
// Get current measurements (with accessories nested)
getLeadMeasurements(leadId: string, companyId: string)

// Get history of all measurements
getMeasurementHistory(leadId: string, companyId: string)

// Create new measurements
createMeasurements(leadId: string, companyId: string, data: MeasurementFormData)

// Update existing
updateMeasurements(measurementId: string, data: Partial<MeasurementFormData>)

// Soft delete
deleteMeasurements(measurementId: string)

// Accessory operations
addMeasurementAccessory(measurementId: string, materialId: string, quantity: number, notes?: string)
updateMeasurementAccessory(accessoryId: string, quantity: number)
removeMeasurementAccessory(accessoryId: string)
```

#### Materials API

```typescript
// Search materials (autocomplete)
searchMaterials(companyId: string, query: string, category?: string)

// Get all materials
getMaterials(companyId: string, category?: string)

// CRUD operations
createMaterial(companyId: string, material: MaterialInsert)
updateMaterial(materialId: string, updates: Partial<MaterialInsert>)
deleteMaterial(materialId: string) // Soft delete
```

---

## React Query Hooks

### Measurements Hooks

**File**: `lib/hooks/use-measurements.ts`

```typescript
// Fetch measurements
useLeadMeasurements(leadId: string)
useMeasurementHistory(leadId: string)

// Mutations
useCreateMeasurements(leadId: string)
useUpdateMeasurements(leadId: string)
useDeleteMeasurements(leadId: string)

// Accessory mutations
useAddMeasurementAccessory(leadId: string)
useUpdateMeasurementAccessory(leadId: string)
useRemoveMeasurementAccessory(leadId: string)
```

All mutations include:
- Automatic query invalidation
- Toast notifications (success/error)
- Error logging

### Materials Hooks

**File**: `lib/hooks/use-materials.ts`

```typescript
// Search (autocomplete)
useSearchMaterials(query: string, category?: string)
// Enabled when query.length >= 2

// Fetch all
useMaterials(category?: string)

// Mutations
useCreateMaterial()
useUpdateMaterial()
useDeleteMaterial()
```

---

## UI Components

### Measurements Tab

**File**: `components/admin/leads/measurements-tab.tsx` (650+ lines)

#### View Mode
- **Roof Area Card**: Displays actual squares, two-story squares, low-slope squares, waste %, total squares
- **Linear Measurements Card**: Ridge, valley, eave, rake, hip (all in feet)
- **Additional Info Card**: Layers to remove, pitch ratio
- **Accessories Section**: 
  - Lists all added accessories with quantities
  - +/- buttons to adjust quantity
  - Remove button (X icon)
  - Add Accessories search input
- **Notes Section**: Free-form text notes
- **Metadata**: Measured by, measured at timestamp

#### Edit Mode
- Form with inputs for all measurement fields
- Number inputs with step controls
- Two-story and low-slope squares fields
- Pitch ratio text input
- Notes textarea
- Save/Cancel buttons

#### Accessory Search
- Search input with magnifying glass icon
- Triggers autocomplete at 2+ characters
- Dropdown shows:
  - Material name
  - Subcategory
  - Price + unit type
- Click to add accessory
- Prevents adding before measurements exist (toast error)

### State Management
```typescript
const [isEditing, setIsEditing] = useState(false)
const [formData, setFormData] = useState<MeasurementFormData>({ ... })
const [searchQuery, setSearchQuery] = useState('')
const [showSearchResults, setShowSearchResults] = useState(false)
```

### Key Features
- Optimistic UI updates
- Real-time calculation display (total squares)
- Material autocomplete with debouncing
- Quantity adjustment with +/- buttons
- Toast validation (can't add accessories before saving measurements)

---

## Database Migrations

### Migration Files

1. **`20241203000002_create_lead_measurements.sql`**
   - Creates `lead_measurements` table
   - Indexes on `company_id`, `lead_id`, `measured_by`, `deleted_at`
   - RLS policies for company isolation
   - Triggers for `updated_at` and auto-calculate `total_squares`

2. **`20241203000003_create_materials_and_accessories.sql`**
   - Creates `materials` table with full-text search index
   - Creates `measurement_accessories` join table
   - RLS policies
   - Seed data for 7 common accessories

3. **`20241203000004_add_roof_type_columns.sql`**
   - Adds `two_story_squares` and `low_slope_squares` columns
   - Safe idempotent migration (checks if columns exist first)

### Migration Order
Run in sequence:
1. Lead measurements table
2. Materials + accessories
3. Roof type columns (if needed)

---

## RLS Policies

All tables enforce company-based row-level security:

```sql
-- Measurements: Users can only access their company's data
CREATE POLICY "Users can access their company's measurements"
  ON public.lead_measurements
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Materials: Same pattern
CREATE POLICY "Users can access their company's materials"
  ON public.materials
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Accessories: Nested check through measurements
CREATE POLICY "Users can access their measurement accessories"
  ON public.measurement_accessories
  FOR ALL
  USING (
    measurement_id IN (
      SELECT id FROM public.lead_measurements
      WHERE company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );
```

---

## User Workflow

### Adding Measurements

1. Navigate to Lead → Measurements tab
2. Click "Add Measurements" (if none exist) or "Edit Measurements"
3. Enter roof measurements:
   - Actual squares (required)
   - Two-story squares (optional)
   - Low-slope squares (optional)
   - Waste percentage (defaults to 10%)
   - Linear measurements: ridge, valley, eave, rake, hip
   - Layers to remove (defaults to 1)
   - Pitch ratio (e.g., "6/12")
   - Notes (free text)
4. Click "Save Measurements"
5. Total squares auto-calculated and displayed

### Adding Accessories

1. After measurements saved, scroll to "Add Accessories" section
2. Type material name in search box (e.g., "turtle")
3. Autocomplete shows matching materials after 2 characters
4. Click material from dropdown to add
5. Default quantity is 1
6. Adjust quantity with +/- buttons
7. Remove unwanted accessories with X button
8. Changes save immediately (optimistic updates)

### Editing Measurements

1. Click "Edit Measurements" button
2. Update any fields
3. Click "Save Measurements"
4. View mode shows updated values
5. History preserved (if implementing audit trail)

---

## Future Enhancements

### Short Term
- [ ] Materials management UI (add/edit custom materials)
- [ ] Material categories filter in search
- [ ] Bulk add accessories (select multiple at once)
- [ ] Export measurements to PDF/Quote

### Medium Term
- [ ] Material inventory tracking
- [ ] Low stock alerts
- [ ] Purchase order generation
- [ ] Material cost rollup in quotes

### Long Term
- [ ] AI-powered material estimation (based on measurements)
- [ ] Material vendor integration
- [ ] Price tracking over time
- [ ] Historical price analysis

---

## Testing Checklist

- [x] Create measurements for new lead
- [x] Update existing measurements
- [x] Search for accessories (autocomplete)
- [x] Add accessories to measurement
- [x] Adjust accessory quantities (+/-)
- [x] Remove accessories
- [x] Total squares auto-calculation
- [x] Two-story and low-slope squares save correctly
- [x] RLS prevents cross-company data access
- [x] Soft delete preserves data
- [ ] Multiple measurements per lead (history)
- [ ] Materials management CRUD
- [ ] Material deactivation (soft delete)

---

## Known Issues

- Database types not auto-generated (Supabase CLI login required)
  - **Workaround**: Manual type definitions in `lib/api/measurements.ts`
- Supabase schema cache delay after migrations
  - **Workaround**: Wait 1-2 minutes or manually reload schema in dashboard

---

## Architecture Decisions

### Why Materials Library?
- **Reusability**: Define materials once, use everywhere
- **Consistency**: Same pricing across all quotes
- **Scalability**: Easy to add new materials without code changes
- **Reporting**: Can analyze material usage across all projects

### Why Join Table?
- **Flexibility**: Many materials per measurement
- **Data Integrity**: `ON DELETE RESTRICT` prevents deleting materials in use
- **Quantity Tracking**: Each accessory has independent quantity
- **Notes**: Can add context per accessory instance

### Why Soft Delete?
- **History**: Preserve old measurements even if lead is deleted
- **Reporting**: Historical data for analytics
- **Recovery**: Undo accidental deletions
- **Compliance**: Some industries require data retention

---

**Contributors**: Jonathan (Lead Developer)  
**Review Date**: January 2025  
**Status**: Production Ready ✅
