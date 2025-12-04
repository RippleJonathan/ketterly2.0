# Auto-Measure Roof Feature (Google Solar API Integration)

## ✅ Implementation Status: **COMPLETE**

This feature automatically measures roofs from satellite imagery using Google's Solar API, calculating squares, pitch, and complexity.

---

## Overview

The Auto-Measure feature provides one-click roof measurement from satellite data, eliminating the need for manual on-site measurements in many cases. It integrates seamlessly into the lead management workflow.

### What It Does

1. **Fetches satellite data** from Google Solar API for a given address
2. **Calculates roof area** in squares (100 sq ft = 1 square)
3. **Determines primary pitch** from the largest roof segment
4. **Assesses complexity** based on number of roof segments
5. **Saves measurements** to the database for quote generation

---

## Tech Stack

### Frontend
- **React Component**: `AutoMeasureButton` - Handles UI and user interaction
- **React Query Hook**: `useAutoMeasure` - Manages API calls and cache invalidation
- **Styling**: Tailwind CSS with shadcn/ui components

### Backend
- **API Route**: `/api/measurements/auto-measure` (POST)
- **Database**: Supabase PostgreSQL with `lead_measurements` table
- **External API**: Google Solar API (`buildingInsights` endpoint)

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

### 1. Database Migration

**File**: `supabase/migrations/20241203000003_add_google_solar_fields.sql`

Adds Google Solar API fields to the existing `lead_measurements` table without modifying core columns.

### 2. API Route

**File**: `app/api/measurements/auto-measure/route.ts`

**Endpoint**: `POST /api/measurements/auto-measure`

**Request Body**:
```json
{
  "leadId": "uuid",
  "companyId": "uuid",
  "latitude": 30.2672,
  "longitude": -97.7431
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
1. Validates coordinates and API key
2. Calls Google Solar API with HIGH quality requirement
3. Extracts `areaMeters2` from `wholeRoofStats`
4. Converts to squares: `(areaMeters2 * 10.764) / 100`
5. Finds largest roof segment for primary pitch
6. Converts degrees to rise/run: `rise = 12 * tan(degrees)`
7. Calculates complexity: <6 segments = simple, 6-12 = moderate, >12 = complex
8. Saves or updates measurement in database

### 3. React Query Hook

**File**: `lib/hooks/use-measurements.ts`

**Hook**: `useAutoMeasure(leadId)`

```typescript
const autoMeasure = useAutoMeasure(leadId)

// Usage
autoMeasure.mutateAsync({ 
  latitude: 30.2672, 
  longitude: -97.7431 
})
```

**Features**:
- Automatic cache invalidation on success
- Toast notifications with details
- Error handling with user-friendly messages

### 4. React Component

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
- Loading state: "Analyzing Satellite Data..."
- Disabled state when coordinates missing
- Success display: Shows squares, pitch, complexity, segments
- Satellite image date display
- Helper text for geocoding requirement

### 5. UI Integration

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
3. Enable the **Solar API**: https://console.cloud.google.com/apis/library/solar.googleapis.com
4. Create credentials → API Key
5. Restrict the API key (recommended):
   - Application restrictions: HTTP referrers (for frontend) or None (for server-side)
   - API restrictions: Solar API

**Pricing**: Google Solar API has a free tier with generous quotas. Check current pricing at https://developers.google.com/maps/documentation/solar/usage-and-billing

---

## User Workflow

### Typical Flow

1. **Create Lead** with address
2. **Geocode Address** (if not already done) to get lat/lng
3. **Navigate to Estimates Tab**
4. **Click "Auto-Measure Roof"** button
5. **Wait 2-3 seconds** for satellite analysis
6. **Review Results**:
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

### Area Conversion
```
1. Get area in meters² from Google: areaMeters2
2. Convert to square feet: areaSquareFeet = areaMeters2 * 10.764
3. Convert to squares: actualSquares = areaSquareFeet / 100
4. Add waste: totalSquares = actualSquares * (1 + wastePercentage/100)
   - Default waste: 10%
```

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
| "Missing required fields" | Incomplete request data | Ensure leadId, companyId, lat, lng provided |
| "Invalid coordinates" | Lat/lng out of range | Validate coordinates before sending |
| "Google Maps API key not configured" | Missing env variable | Add `GOOGLE_MAPS_API_KEY` to `.env.local` |
| "No satellite data available" | Address outside Google's coverage | Use manual measurements |
| "No roof data available" | Building not detected | Verify address or use manual method |

### User-Facing Messages

The component shows helpful messages:
- ✅ Success: "Roof analyzed: 25.5 squares, 6/12 pitch, simple complexity"
- ❌ Error: "Failed to analyze satellite data: [specific reason]"
- ⚠️ Warning: "Geocode the address first to enable auto-measure"

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

- [ ] Click button with valid address → Success
- [ ] Click button without address → Disabled with helper text
- [ ] Click button without coordinates → Helper text shown
- [ ] API key missing → Error toast with clear message
- [ ] Invalid coordinates → Error toast
- [ ] Address outside coverage → Error toast "No satellite data"
- [ ] Successful measurement → Toast + results display
- [ ] Results show: squares, pitch, complexity, segments
- [ ] Measurements saved to database
- [ ] Measurements visible in Measurements tab
- [ ] Quote creation can use saved measurements

### Test Addresses

**US Addresses with Good Coverage**:
```
1. 1600 Pennsylvania Avenue NW, Washington, DC 20500
   Lat: 38.8977, Lng: -77.0365

2. 1 Infinite Loop, Cupertino, CA 95014
   Lat: 37.3318, Lng: -122.0312

3. 350 5th Ave, New York, NY 10118
   Lat: 40.7484, Lng: -73.9857
```

---

## Related Files

### Core Implementation
- `supabase/migrations/20241203000003_add_google_solar_fields.sql`
- `app/api/measurements/auto-measure/route.ts`
- `lib/hooks/use-measurements.ts`
- `components/admin/leads/auto-measure-button.tsx`

### Integration Points
- `components/admin/leads/estimates-tab.tsx`
- `app/(admin)/admin/leads/[id]/page.tsx`
- `lib/api/measurements.ts`

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

**Last Updated**: December 3, 2024  
**Version**: 1.0.0  
**Status**: ✅ Complete and Ready for Testing