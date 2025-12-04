# Dynamic Pitch Calculation Feature

## Overview
Added `flat_squares` field to enable dynamic square recalculation when pitch changes. This solves the issue where users need to manually adjust pitch without auto-measure data.

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/20241204000001_add_flat_squares.sql`
- Added `flat_squares` column to `lead_measurements` table
- Type: `DECIMAL(10,2)`
- Purpose: Stores base roof area without pitch multiplier

**To apply migration**: Run this SQL in Supabase Dashboard > SQL Editor:
```sql
ALTER TABLE public.lead_measurements ADD COLUMN IF NOT EXISTS flat_squares DECIMAL(10,2);
```

### 2. TypeScript Types
**Files**: 
- `lib/api/measurements.ts` - Added `flat_squares` to interfaces
- `components/admin/leads/measurements-tab.tsx` - Added to form state

### 3. Calculation Logic
**New function**: `calculateActualSquaresFromPitch(flatSquares, pitchRatio)`
- Location: `components/admin/leads/measurements-tab.tsx` (lines ~25-47)
- Parses pitch ratio (e.g., "6/12") into rise/run
- Converts to radians: `atan(rise/run)`
- Applies multiplier: `flat_squares * (1 / cos(pitch_radians))`
- Returns actual squares with pitch applied

**Dynamic recalculation**: `useEffect` hook automatically recalculates `actual_squares` when:
- `flat_squares` changes (user edits)
- `pitch_ratio` changes (user adjusts pitch)

### 4. UI Updates

#### Edit Form (lines ~733-763)
- **Flat Squares field**: Manual input for base measurement
  - Label: "Flat Squares"
  - Helper text: "Base measurement without pitch"
  
- **Actual Squares field**: Auto-calculated or manual
  - Label: "Actual Squares (with pitch)"
  - Disabled when flat_squares and pitch_ratio are both set
  - Shows "Auto-calculated from flat squares + pitch" when auto mode
  - Shows "Total roof area with pitch applied" when manual mode

#### View Mode (lines ~432-442)
- Shows flat_squares if exists
- Displays as "Flat Squares" with helper text "(no pitch)"
- Shows above "Actual Squares" for clarity

### 5. Map Integration
**File**: `components/admin/leads/roof-measurement-map.tsx`
- Calculates `flatSquares` from polygon data: sum of all `flatArea / 100`
- Passes both `flat_squares` and `actual_squares` to parent
- Parent auto-saves both values to database

**Auto-measure**: When satellite measurement runs, stores result as both flat and actual (user can then adjust pitch to recalculate)

## How It Works

### Scenario 1: Auto-Measure (Satellite)
1. User clicks "Auto-Measure"
2. Google Solar API returns actual_squares (with pitch already applied)
3. System stores it as both `flat_squares` and `actual_squares`
4. User can then adjust pitch in form → actual_squares recalculates automatically

### Scenario 2: Manual Drawing on Map
1. User draws polygons on map
2. Map calculates flat area using spherical geometry
3. Map samples pitch from satellite segments (if available)
4. Map calculates both flat_squares and actual_squares
5. Saves to database
6. User can adjust pitch in form → actual_squares recalculates

### Scenario 3: Manual Entry
1. User enters flat_squares directly (e.g., 25.5)
2. User enters pitch_ratio (e.g., "6/12")
3. System automatically calculates: actual_squares = 25.5 / cos(atan(6/12)) ≈ 28.6
4. Actual Squares field becomes disabled (shows auto-calculated value)
5. User changes pitch to "9/12" → actual_squares updates to ≈ 30.2

## Benefits

1. **No confusion for users**: They can always enter flat measurement + pitch
2. **Works without auto-measure**: Manual measurements get pitch applied correctly
3. **Dynamic adjustment**: Change pitch → squares recalculate instantly
4. **Backwards compatible**: Existing measurements still work (actual_squares is still editable if no flat_squares)
5. **Accurate**: Uses same pitch multiplier formula as drawing tool (1/cos(pitch_radians))

## Testing Checklist

- [ ] Apply database migration
- [ ] Test auto-measure → verify flat_squares and actual_squares both populated
- [ ] Test manual drawing → verify flat_squares calculation
- [ ] Test manual entry:
  - [ ] Enter flat_squares: 25
  - [ ] Enter pitch: "6/12"
  - [ ] Verify actual_squares auto-calculates to ~28
  - [ ] Change pitch to "9/12"
  - [ ] Verify actual_squares updates to ~30
- [ ] Test form submission → verify both fields save to database
- [ ] Test view mode → verify flat_squares displays correctly

## Migration Instructions

1. **Apply the migration**:
   - Go to Supabase Dashboard
   - Navigate to SQL Editor
   - Copy contents of `supabase/migrations/20241204000001_add_flat_squares.sql`
   - Run the SQL

2. **Restart dev server** (if needed):
   ```bash
   npm run dev
   ```

3. **Test the feature**:
   - Go to any lead
   - Click Measurements tab
   - Try manual entry with flat_squares + pitch
   - Watch actual_squares calculate automatically

## Code Locations

| Feature | File | Lines |
|---------|------|-------|
| Database migration | `supabase/migrations/20241204000001_add_flat_squares.sql` | All |
| Calculation function | `components/admin/leads/measurements-tab.tsx` | ~25-47 |
| Dynamic recalculation | `components/admin/leads/measurements-tab.tsx` | ~106-119 |
| Flat squares input | `components/admin/leads/measurements-tab.tsx` | ~733-748 |
| Actual squares input | `components/admin/leads/measurements-tab.tsx` | ~749-763 |
| View mode display | `components/admin/leads/measurements-tab.tsx` | ~432-442 |
| Map calculation | `components/admin/leads/roof-measurement-map.tsx` | ~548-551 |
| Type definitions | `lib/api/measurements.ts` | 8-38, 54-70 |
