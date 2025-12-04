# Auto-Measure Roof Feature (Google Solar API Integration)

## ✅ Implementation Status: **COMPLETE**

This feature automatically measures roofs from satellite imagery using Google's Solar API, calculating squares, pitch, and complexity.

---

## Overview

The Auto-Measure feature provides one-click roof measurement from satellite data, eliminating the need for manual on-site measurements in many cases. It integrates seamlessly into the lead management workflow.

### What It Does

1. **Automatically geocodes address** if coordinates not available
2. **Fetches satellite data** from Google Solar API for the location
3. **Calculates roof area** in squares (100 sq ft = 1 square)
4. **Determines primary pitch** from the largest roof segment
5. **Assesses complexity** based on number of roof segments
6. **Saves measurements** to the database for quote generation

---

## Tech Stack

### Frontend
- **React Component**: `AutoMeasureButton` - Handles UI and user interaction
- **React Query Hook**: `useAutoMeasure` - Manages API calls and cache invalidation
- **Styling**: Tailwind CSS with shadcn/ui components

### Backend
- **API Routes**: 
  - `/api/geocode` (POST) - Geocodes addresses to lat/lng
  - `/api/measurements/auto-measure` (POST) - Measures roofs from coordinates
- **Database**: Supabase PostgreSQL with `lead_measurements` table
- **External APIs**: 
  - Google Geocoding API (address → coordinates)
  - Google Solar API (`buildingInsights` endpoint)

### Database Schema
- **Table**: `lead_measurements`
- **New Columns**:
  - `roof_data_raw` (JSONB) - Full Google API response
  - `roof_pitch` (TEXT) - Rise/run format (e.g., "6/12")
  - `roof_pitch_degrees` (NUMERIC) - Pitch in degrees
  - `roof_complexity` (TEXT) - simple | moderate | complex
  - `satellite_data_date` (TIMESTAMPTZ) - Imagery capture date
  - `measurement_source` (TEXT) - 'google_solar' | 'manual' | 'eagleview' | 'other'

---

## Implementation Details

### 1. Geocoding API Route

**File**: `app/api/geocode/route.ts`

**Endpoint**: `POST /api/geocode`

**Request Body**:
```json
{
  "address": "123 Main St, Austin, TX 78701"
}
```

**Response**:
```json
{
  "latitude": 30.2672,
  "longitude": -97.7431,
  "formattedAddress": "123 Main St, Austin, TX 78701, USA"
}
```

**Logic**:
1. Validates address input
2. Calls Google Geocoding API
3. Extracts lat/lng from first result
4. Returns formatted address for verification

### 2. Database Migration

**File**: `supabase/migrations/20241203000003_add_google_solar_fields.sql`

Adds Google Solar API fields to the existing `lead_measurements` table without modifying core columns.

### 3. Auto-Measure API Route

**File**: `app/api/measurements/auto-measure/route.ts`

**Endpoint**: `POST /api/measurements/auto-measure`

**Request Body**:
```json
{
  "leadId": "uuid",
  "companyId": "uuid",
  "address": "123 Main St, Austin, TX 78701",
  "latitude": 30.2672,  // Optional if address provided
  "longitude": -97.7431  // Optional if address provided
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "measurement_uuid",
    "actual_squares": 25.5,
    "total_squares": 28.05,
    "roof_pitch": "6/12",
    "roof_pitch_degrees": 26.57,
    "roof_complexity": "simple",
    "segment_count": 4,
    "satellite_date": "2023-08-15T00:00:00Z"
  },
  "message": "Roof analyzed: 25.5 squares, 6/12 pitch, simple complexity"
}
```

**Logic**:
1. Geocodes address if coordinates not provided
2. Validates coordinates and API key
3. Calls Google Solar API with HIGH quality requirement
4. Extracts `areaMeters2` from `wholeRoofStats`
5. Converts to squares: `(areaMeters2 * 10.764) / 100`
6. Finds largest roof segment for primary pitch
7. Converts degrees to rise/run: `rise = 12 * tan(degrees)`
8. Calculates complexity: <6 segments = simple, 6-12 = moderate, >12 = complex
9. Saves or updates measurement in database

### 4. React Query Hook

**File**: `lib/hooks/use-measurements.ts`

**Hook**: `useAutoMeasure(leadId)`

```typescript
const autoMeasure = useAutoMeasure(leadId)

// Usage with address (automatic geocoding)
autoMeasure.mutateAsync({ 
  address: "123 Main St, Austin, TX 78701"
})

// Usage with coordinates (skip geocoding)
autoMeasure.mutateAsync({ 
  latitude: 30.2672, 
  longitude: -97.7431 
})
```

**Features**:
- Automatic geocoding if only address provided
- Automatic cache invalidation on success
- Toast notifications with details
- Error handling with user-friendly messages

### 5. React Component

**File**: `components/admin/leads/auto-measure-button.tsx`

**Component**: `<AutoMeasureButton />`

**Props**:
```typescript
{
  leadId: string
  latitude?: number | null
  longitude?: number | null
  address?: string
  onSuccess?: () => void
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  className?: string
}
```

**Features**:
- Automatic geocoding: Works with just address or coordinates
- Loading states: "Geocoding Address..." → "Analyzing Satellite Data..."
- Disabled state when no address or coordinates provided
- Success display: Shows squares, pitch, complexity, segments
- Satellite image date display
- Helper text when address needed

### 6. UI Integration

**Locations**:
1. **Estimates Tab** (`components/admin/leads/estimates-tab.tsx`)
   - Empty state: Prominent call-to-action before creating first quote
   - Header: Quick access button when quotes exist
   - Displays current measurements if available

2. **Lead Detail Page** (`app/(admin)/admin/leads/[id]/page.tsx`)
   - Passes address and coordinates to EstimatesTab
   - Could also be added to Measurements tab

---

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Getting Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create or select a project
3. Enable the **Geocoding API**: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com
4. Enable the **Solar API**: https://console.cloud.google.com/apis/library/solar.googleapis.com
5. Create credentials → API Key
6. Restrict the API key (recommended):
   - Application restrictions: HTTP referrers (for frontend) or None (for server-side)
   - API restrictions: Geocoding API + Solar API

**Pricing**: Both APIs have free tiers with generous quotas. Check current pricing:
- Geocoding: https://developers.google.com/maps/documentation/geocoding/usage-and-billing
- Solar: https://developers.google.com/maps/documentation/solar/usage-and-billing

---

## User Workflow

### Typical Flow

1. **Create Lead** with address
2. **Navigate to Estimates Tab**
3. **Click "Auto-Measure Roof"** button
4. **Wait 2-4 seconds** for geocoding + satellite analysis
5. **Review Results**:
   - Squares (actual and with waste)
   - Roof pitch
   - Complexity rating
   - Number of segments
7. **Create Quote** using the measurements

### Fallback Options

If Google doesn't have coverage:
- **Manual entry**: Use Measurements tab
- **EagleView integration**: (Future enhancement)
- **Other services**: Set `measurement_source` accordingly

---

## Calculation Details

### Area Conversion with Pitch Adjustment
```
1. For each roof segment from Google Solar API:
   - Get flat area in meters²: areaMeters2
   - Get pitch in degrees: pitchDegrees
   - Calculate pitch multiplier: 1 / cos(pitchDegrees × π / 180)
   - Calculate sloped area: flatArea × pitchMultiplier

2. Sum all segment sloped areas: totalSlopedMeters2

3. Check buildingStats vs wholeRoofStats:
   - wholeRoofStats = area assigned to detected segments
   - buildingStats = entire building (may include unassigned areas)
   - If buildingStats > wholeRoofStats, scale up by ratio
   - This captures areas not assigned to specific segments

4. Convert to square feet: areaSquareFeet = totalSlopedMeters2 × 10.764

5. Convert to squares: satelliteSquares = areaSquareFeet / 100

6. Add overhang allowance: actualSquares = satelliteSquares × 1.07
   - Default: 7% overhang allowance

Examples of pitch multipliers:
- 4/12 pitch (18.4°) → 1.054x multiplier (5.4% more area)
- 6/12 pitch (26.6°) → 1.118x multiplier (11.8% more area)  
- 8/12 pitch (33.7°) → 1.202x multiplier (20.2% more area)
- 12/12 pitch (45°) → 1.414x multiplier (41.4% more area)
```

### Important Limitations

**Google Solar API measures roof surface area for solar panel placement**, which differs from roofing measurements:

1. **Segment Detection Limitations** - Google assigns roof areas to segments based on orientation and pitch. Some areas may not be assigned to any segment:
   - Small roof sections between segments
   - Complex transitions and valleys
   - Areas with inconsistent pitch detection
   - Our code uses `buildingStats` to capture total building area and scales up when needed

2. **Overhangs/Eaves Not Included** - Google measures to the roof edge, not the drip edge. Typical overhangs add 1-2 squares for residential homes. We automatically add 7% to compensate.

3. **Some Areas May Be Missed**:
   - Detached garages or separate structures
   - Small porches or covered entryways  
   - Complex dormers or bay windows
   - Areas obscured by trees or shadows

4. **Quality-Dependent Coverage** - Lower quality data (MEDIUM/LOW) may miss small segments

**Expected Accuracy**: Satellite measurements typically underestimate by **10-15%** compared to on-site measurements. This is normal and expected.

**Recommendations**:
- Use satellite measurements as a starting point
- Add 10-15% buffer for overhangs and missed areas
- Verify with on-site measurement for final quotes
- Use the Measurements tab to add manual adjustments
- Perfect for quick estimates, use EagleView for precision

### Pitch Conversion
```
1. Get pitch in degrees from Google: pitchDegrees
2. Calculate rise: rise = 12 * tan(pitchDegrees * π / 180)
3. Round to nearest integer
4. Format: "${rise}/12"

Examples:
- 26.57° → "6/12"
- 36.87° → "9/12"
- 18.43° → "4/12"
```

### Complexity Assessment
```
Based on number of roof segments (roofSegmentStats.length):
- Simple: < 6 segments (typical gable roof)
- Moderate: 6-12 segments (complex gable or simple hip)
- Complex: > 12 segments (multiple levels, dormers, etc.)
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing required fields" | Incomplete request data | Provide either address or coordinates |
| "Could not geocode address" | Invalid/unrecognized address | Verify address format and location |
| "Invalid coordinates" | Lat/lng out of range | Validate coordinates before sending |
| "Google Maps API key not configured" | Missing env variable | Add `GOOGLE_MAPS_API_KEY` to `.env.local` |
| "No satellite data available" | Address outside Google's coverage | Use manual measurements |
| "No roof data available" | Building not detected | Verify address or use manual method |

### User-Facing Messages

The component shows helpful messages:
- ✅ Success: "Roof analyzed: 25.5 squares, 6/12 pitch, simple complexity"
- ❌ Error: "Failed to analyze satellite data: [specific reason]"
- ⚠️ Warning: "Add an address to enable auto-measure"
- 🔄 Loading: "Geocoding Address..." → "Analyzing Satellite Data..."

---

## Future Enhancements

### Phase 2 Features
- [ ] Satellite image preview overlay
- [ ] Roof segment visualization with colors
- [ ] Manual pitch override
- [ ] Historical measurement comparison
- [ ] Export to PDF report

### Integrations
- [ ] EagleView API for premium measurements
- [ ] Nearmap integration
- [ ] Auto-populate quote line items from measurements

### Optimizations  
- [ ] Cache Google API responses (24 hours)
- [ ] Batch processing for multiple leads
- [ ] Background job for leads without measurements

---

## Testing

### Manual Testing Checklist

- [ ] Click button with just address → Automatic geocoding + success
- [ ] Click button with coordinates → Direct measurement + success
- [ ] Click button without address or coordinates → Disabled with helper text
- [ ] Geocoding API key missing → Error toast with clear message
- [ ] Invalid address → Error toast "Could not geocode address"
- [ ] Invalid coordinates → Error toast
- [ ] Address outside coverage → Error toast "No satellite data"
- [ ] Successful measurement → Toast + results display
- [ ] Results show: squares, pitch, complexity, segments
- [ ] Measurements saved to database
- [ ] Measurements visible in Measurements tab
- [ ] Quote creation can use saved measurements
- [ ] Loading states show correct messages (geocoding → analyzing)

### Test Addresses

**US Addresses with Good Coverage**:
```
1. 1600 Pennsylvania Avenue NW, Washington, DC 20500
   (White House - simple flat roof)

2. 1 Infinite Loop, Cupertino, CA 95014
   (Apple Park - complex modern roof)

3. 350 5th Ave, New York, NY 10118
   (Empire State Building - complex commercial roof)
```

---

## Related Files

### Core Implementation
- `app/api/geocode/route.ts` - Geocoding API endpoint
- `app/api/measurements/auto-measure/route.ts` - Auto-measure API with geocoding
- `supabase/migrations/20241203000003_add_google_solar_fields.sql` - Database schema
- `lib/hooks/use-measurements.ts` - React Query hooks
- `components/admin/leads/auto-measure-button.tsx` - UI component

### Integration Points
- `components/admin/leads/estimates-tab.tsx` - Main integration point
- `app/(admin)/admin/leads/[id]/page.tsx` - Passes data to EstimatesTab
- `lib/api/measurements.ts` - Measurement API functions

### Dependencies
- `@tanstack/react-query` - Caching and state management
- `sonner` - Toast notifications
- `lucide-react` - Icons (Satellite, Loader2)
- `shadcn/ui` - Button, Badge components

---

## API Reference

### Google Solar API

**Endpoint**: `https://solar.googleapis.com/v1/buildingInsights:findClosest`

**Parameters**:
- `location.latitude` (number) - Latitude
- `location.longitude` (number) - Longitude
- `requiredQuality` (string) - "HIGH" | "MEDIUM" | "LOW"
- `key` (string) - API key

**Response Structure**:
```json
{
  "solarPotential": {
    "wholeRoofStats": {
      "areaMeters2": 250.5
    },
    "roofSegmentStats": [
      {
        "pitchDegrees": 26.57,
        "stats": {
          "areaMeters2": 125.2
        }
      }
    ]
  },
  "imageryDate": {
    "year": 2023,
    "month": 8,
    "day": 15
  }
}
```

**Documentation**: https://developers.google.com/maps/documentation/solar

---

**Last Updated**: December 4, 2024  
**Version**: 1.1.0  
**Status**: ✅ Complete with Automatic Geocoding