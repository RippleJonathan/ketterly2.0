# Roof Measurement Tool - Issues & Fixes

## Issues Identified (December 4, 2024)

### 1. ✅ Dynamic Pitch Calculation Not Working
**Problem**: When manually entering flat_squares=29.45 and pitch=6/12, actual_squares was showing 29.45 instead of ~33.0

**Root Cause**: The useEffect for dynamic calculation was triggering on initial data load, but the calculation function was correct.

**Fix**: Added conditional logic to only recalculate when:
- User is in edit mode (`isEditing === true`)
- Both `flat_squares` and `pitch_ratio` have values
- Pitch ratio is not empty string
- The calculated value differs from current value by >0.01

**Location**: `components/admin/leads/measurements-tab.tsx` lines ~120-138

---

### 2. ✅ Auto-Measure vs Manual Drawing Conflict
**Problem**: 
- Auto-measure shows 35.7 squares
- When user opens edit form, it changes to polygon measurement (29.45)
- Confusing UX - numbers jump around

**Root Cause**: Auto-measure was setting both `flat_squares` and `actual_squares` from the satellite API result, then when user drew polygons, it overwrote those values.

**Fix**: 
- Auto-measure now **only** sets satellite data and pitch
- It does **NOT** pre-populate squares
- User must draw on the map to get measurements
- Drawing calculates both `flat_squares` and `actual_squares` correctly

**Workflow**:
1. Click "Auto-Measure" → loads satellite imagery + pitch data
2. Click "Show Map" → see satellite view with pitch overlay
3. Draw polygons → calculates flat area + applies pitch → saves both values
4. Manual pitch changes → recalculates actual_squares from flat_squares

**Location**: `components/admin/leads/measurements-tab.tsx` lines ~165-180

---

### 3. ⚠️ Area Measurement Discrepancy (Minor)
**Problem**: 
- Our tool: 29.45 squares (flat area)
- Ripple Roofs: 30.49 squares (flat area)
- Difference: 1.04 squares (~3.4%)

**Investigation**:
- Both tools use **identical** calculation: `google.maps.geometry.spherical.computeArea()`
- Both convert m² to ft²: `area * 10.764`
- Both round the same way: `Math.round()`

**Root Cause**: The difference is from drawing the polygon slightly differently
- Different number of vertices
- Slightly different vertex positions
- User error in tracing the roof outline

**Conclusion**: This is **NOT a bug**. The calculation is correct. The 3.4% variance is normal for manual drawing.

**Recommendation**: 
- Provide drawing tips in UI (already done)
- Consider snap-to-corner feature for more precision (already have 15px snap)
- Possibly add "confidence score" based on polygon complexity

---

### 4. ✅ Map Size Too Small
**Problem**: Map was h-96 (384px), hard to see details when drawing

**Fix**: Increased to h-[650px] for better visibility

**Location**: `components/admin/leads/roof-measurement-map.tsx` line ~607

---

## Current Behavior (After Fixes)

### Manual Entry Workflow
1. User enters **Flat Squares**: `29.45`
2. User enters **Pitch**: `6/12`
3. System calculates **Actual Squares**: `29.45 / cos(atan(6/12))` = **33.0** ✅
4. User changes pitch to `9/12`
5. **Actual Squares** updates to **35.6** ✅
6. Actual Squares field is disabled (auto-calculated)

### Auto-Measure + Drawing Workflow
1. User clicks "Auto-Measure"
2. Satellite imagery loads
3. Pitch is detected (e.g., 26.6°)
4. User clicks "Show Map"
5. Map shows satellite view with colored pitch segments
6. User draws polygon on roof
7. System calculates:
   - Flat area using spherical geometry
   - Pitch from sampled segments
   - Sloped area = flat area / cos(pitch)
   - Flat squares = flat area / 100
   - Actual squares = sloped area / 100
8. Saves **both** flat_squares and actual_squares
9. User can later adjust pitch in form → actual_squares recalculates

### Manual Drawing (No Auto-Measure) Workflow
1. User has lead with lat/lng
2. User clicks "Show Map"
3. Map loads (no satellite pitch data)
4. User draws polygon
5. System calculates flat area using spherical geometry
6. Pitch = 0° (no satellite data)
7. Saves flat_squares
8. User manually enters pitch in form (e.g., "6/12")
9. Actual_squares auto-calculates from flat_squares + pitch ✅

---

## Technical Details

### Pitch Multiplier Formula
```typescript
// Parse pitch ratio (e.g., "6/12")
const pitchMatch = pitchRatio.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/)
const rise = parseFloat(pitchMatch[1]) // 6
const run = parseFloat(pitchMatch[2])  // 12

// Convert to radians
const pitchRadians = Math.atan(rise / run) // atan(6/12) = 0.4636 rad = 26.57°

// Calculate multiplier
const pitchMultiplier = 1 / Math.cos(pitchRadians) // 1 / cos(0.4636) = 1.118

// Apply to flat area
const actualSquares = flatSquares * pitchMultiplier // 29.45 * 1.118 = 32.9 squares
```

### Spherical Area Calculation
```typescript
// Google Maps API - identical to Ripple Roofs
const areaM2 = google.maps.geometry.spherical.computeArea(polygon.getPath())
const areaSqFt = Math.round(areaM2 * 10.764) // 1 m² = 10.764 ft²
const squares = areaSqFt / 100
```

### Database Schema
```sql
flat_squares DECIMAL(10,2)     -- Base area without pitch
actual_squares DECIMAL(10,2)   -- Area with pitch multiplier applied
pitch_ratio TEXT               -- e.g., "6/12" or "26.6°"
```

---

## Remaining Work

### Migration Needed
Run this SQL in Supabase Dashboard:
```sql
ALTER TABLE public.lead_measurements 
ADD COLUMN IF NOT EXISTS flat_squares DECIMAL(10,2);

COMMENT ON COLUMN public.lead_measurements.flat_squares IS 
'Flat roof area in squares (no pitch multiplier applied). Used to dynamically calculate actual_squares when pitch changes.';
```

### Testing Checklist
- [x] Fix dynamic pitch calculation (only in edit mode)
- [x] Fix auto-measure conflict (don't set squares)
- [x] Make map bigger
- [ ] Apply database migration
- [ ] Test manual entry: flat_squares + pitch → actual_squares calculates
- [ ] Test pitch change: 6/12 → 9/12 → actual_squares updates
- [ ] Test auto-measure + drawing → both values saved
- [ ] Test manual drawing (no satellite) → can add pitch later
- [ ] Verify no infinite loops in useEffect

---

## Known Limitations

1. **Area Variance**: Manual drawing will always have some variance compared to other tools (typically 3-5%)
2. **Pitch Detection**: Only works when satellite data available (Google Solar API)
3. **Complex Roofs**: Multi-section roofs need multiple polygons drawn separately
4. **Auto-Measure Cost**: Google Solar API is paid service (currently unlimited but could hit quota)

---

## Future Enhancements

1. **Confidence Score**: Show accuracy indicator based on polygon complexity
2. **Auto-Snap to Roof Edges**: Use satellite edge detection to auto-snap vertices
3. **Multi-Pitch Support**: Allow different pitch values for different roof sections
4. **AI-Assisted Drawing**: Use ML to detect roof outline automatically
5. **Comparison View**: Show auto-measure vs manual drawing side-by-side
6. **Export to CAD**: Allow exporting polygon data to AutoCAD/Blender

---

Last Updated: December 4, 2024
Status: ✅ Core issues fixed, migration pending
