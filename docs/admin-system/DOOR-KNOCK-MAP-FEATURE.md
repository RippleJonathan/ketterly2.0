# Door-Knocking Map Feature (Simplified Implementation Plan)

**Status:** Ready for Implementation  
**Created:** January 15, 2026  
**Priority:** High  
**Estimated Time:** 15-20 hours

---

## 📋 Overview

A streamlined door-knocking tracking system that allows sales and marketing reps to drop pins on a map while canvassing neighborhoods. The system tracks activity, converts appointments to leads, and provides analytics on door-knocking performance.

**Key Simplifications:**
- ❌ No territory polygon management (future phase)
- ❌ No PostGIS spatial queries (future phase)
- ✅ Simple pin dropping with lat/lng coordinates
- ✅ Reuses existing lead form and appointment system
- ✅ Location-based filtering (not territory-based)
- ✅ Analytics dashboard for performance tracking

---

## 🎯 Business Objectives

1. **Track Field Activity**: Record every door knocked with outcome (Not Home, Appointment, etc.)
2. **Convert to Pipeline**: Seamlessly convert Appointment pins to leads + scheduled appointments
3. **Measure Performance**: Track conversion rates (doors knocked → appointments set)
4. **Team Visibility**: Managers see team activity by location
5. **Mobile-First**: Optimize for field use on phones/tablets
6. **Speed & Performance**: Fast load times, map clustering, optimized queries

---

## 🗄️ Database Schema

### Existing Tables (Updates Required)

#### companies table
```sql
-- Add door knocking feature flag
ALTER TABLE public.companies 
ADD COLUMN door_knock_enabled BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX idx_companies_door_knock_enabled 
ON companies(door_knock_enabled) 
WHERE door_knock_enabled = true;

COMMENT ON COLUMN companies.door_knock_enabled IS 
  'Premium feature: Enables door-knocking map and activity tracking';
```

#### leads table
```sql
-- Add 'door_knocking' to valid lead sources
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_source_check 
CHECK (source IN (
  'website', 
  'referral', 
  'facebook', 
  'google', 
  'yard_sign', 
  'door_hanger',
  'door_knocking',  -- NEW
  'phone',
  'call_in',
  'other'
));
```

### New Table: door_knocks

```sql
CREATE TABLE public.door_knocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Only for appointment pins
  
  -- Pin details
  pin_type TEXT NOT NULL CHECK (pin_type IN (
    'not_home',
    'not_interested', 
    'go_back',
    'unqualified',
    'appointment'
  )),
  
  -- Location data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT, -- Geocoded address
  
  -- Follow-up tracking
  callback_date DATE, -- For "go_back" pins - when to return
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_door_knocks_company_id ON door_knocks(company_id);
CREATE INDEX idx_door_knocks_location_id ON door_knocks(location_id);
CREATE INDEX idx_door_knocks_user_id ON door_knocks(user_id);
CREATE INDEX idx_door_knocks_pin_type ON door_knocks(pin_type);
CREATE INDEX idx_door_knocks_created_at ON door_knocks(created_at DESC);
CREATE INDEX idx_door_knocks_deleted_at ON door_knocks(deleted_at);
CREATE INDEX idx_door_knocks_callback_date ON door_knocks(callback_date) WHERE callback_date IS NOT NULL;

-- Spatial index for clustering pins (performance optimization)
CREATE INDEX idx_door_knocks_coordinates ON door_knocks(latitude, longitude);

-- Composite index for common query patterns
CREATE INDEX idx_door_knocks_company_location_date 
ON door_knocks(company_id, location_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE door_knocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their company's door knocks"
  ON door_knocks FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_door_knocks_updated_at
  BEFORE UPDATE ON door_knocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE door_knocks IS 'Tracks door-knocking field activity with geocoded locations';
COMMENT ON COLUMN door_knocks.callback_date IS 'When to return for "go_back" pins';
COMMENT ON COLUMN door_knocks.lead_id IS 'Links to lead record when appointment pin is converted';
```

### Permissions (user_permissions table)

```sql
ALTER TABLE public.user_permissions 
ADD COLUMN can_view_door_knocking_map BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_create_door_knocks BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_view_team_door_knocks BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN can_view_door_knock_analytics BOOLEAN DEFAULT false NOT NULL;

-- Comments
COMMENT ON COLUMN user_permissions.can_view_door_knocking_map IS 'Access to door-knocking map interface';
COMMENT ON COLUMN user_permissions.can_create_door_knocks IS 'Ability to drop pins and track door knocks';
COMMENT ON COLUMN user_permissions.can_view_team_door_knocks IS 'See team members door knocking activity';
COMMENT ON COLUMN user_permissions.can_view_door_knock_analytics IS 'Access to analytics and performance reports';
```

---

## 🔐 Permissions & Role Templates

### Permission Definitions

- **can_view_door_knocking_map**: Access the `/admin/door-knocking` map page
- **can_create_door_knocks**: Drop pins and record door knock activity
- **can_view_team_door_knocks**: View door knocks from team members (not just own)
- **can_view_door_knock_analytics**: Access analytics dashboard with performance metrics

### Default Role Templates

```typescript
// lib/types/users.ts - DEFAULT_ROLE_PERMISSIONS

{
  super_admin: {
    can_view_door_knocking_map: true,
    can_create_door_knocks: true,
    can_view_team_door_knocks: true,
    can_view_door_knock_analytics: true,
  },
  admin: {
    can_view_door_knocking_map: true,
    can_create_door_knocks: true,
    can_view_team_door_knocks: true,
    can_view_door_knock_analytics: true,
  },
  office: {
    can_view_door_knocking_map: true,
    can_create_door_knocks: false,
    can_view_team_door_knocks: true,
    can_view_door_knock_analytics: true,
  },
  sales_manager: {
    can_view_door_knocking_map: true,
    can_create_door_knocks: true,
    can_view_team_door_knocks: true, // See their team
    can_view_door_knock_analytics: true,
  },
  sales: {
    can_view_door_knocking_map: true,
    can_create_door_knocks: true,
    can_view_team_door_knocks: false, // Only their own
    can_view_door_knock_analytics: false,
  },
  marketing: {
    can_view_door_knocking_map: true,
    can_create_door_knocks: true,
    can_view_team_door_knocks: false,
    can_view_door_knock_analytics: false,
  },
  production: {
    can_view_door_knocking_map: false,
    can_create_door_knocks: false,
    can_view_team_door_knocks: false,
    can_view_door_knock_analytics: false,
  },
}
```

---

## 🎨 Pin Type Configuration

### Pin Types & Color Coding

```typescript
// lib/constants/door-knocking.ts

export const PIN_CONFIG = {
  not_home: {
    label: 'Not Home',
    color: '#FCD34D', // Yellow-400
    iconColor: '#F59E0B', // Amber-500
    icon: 'home-slash',
    description: 'Knocked but no one answered',
    showCallbackDate: false,
  },
  not_interested: {
    label: 'Not Interested',
    color: '#EF4444', // Red-500
    iconColor: '#DC2626', // Red-600
    icon: 'x-circle',
    description: 'Homeowner declined services',
    showCallbackDate: false,
  },
  go_back: {
    label: 'Go Back',
    color: '#F59E0B', // Amber-500
    iconColor: '#D97706', // Amber-600
    icon: 'arrow-u-turn-left',
    description: 'Need to return later',
    showCallbackDate: true, // Show callback date picker
  },
  unqualified: {
    label: 'Unqualified',
    color: '#9CA3AF', // Gray-400
    iconColor: '#6B7280', // Gray-500
    icon: 'ban',
    description: 'Not a fit for services',
    showCallbackDate: false,
  },
  appointment: {
    label: 'Appointment',
    color: '#10B981', // Green-500
    iconColor: '#059669', // Green-600
    icon: 'calendar-check',
    description: 'Appointment scheduled',
    showCallbackDate: false,
  },
} as const

export type PinType = keyof typeof PIN_CONFIG

// Google Maps marker configuration
export const getMarkerIcon = (pinType: PinType) => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: PIN_CONFIG[pinType].color,
  fillOpacity: 1,
  strokeColor: PIN_CONFIG[pinType].iconColor,
  strokeWeight: 2,
  scale: 8,
})
```

---

## 🛠️ Backend Implementation

### API Routes (Next.js App Router)

**File Structure:**
```
app/api/
  door-knocks/
    route.ts          # GET (list), POST (create)
    [id]/
      route.ts        # GET (detail), PATCH (update), DELETE (soft delete)
    stats/
      route.ts        # GET (analytics by user/location/company)
    geocode/
      route.ts        # POST (reverse geocode lat/lng to address)
```

### API Functions (lib/api/door-knocks.ts)

```typescript
import { ApiResponse } from '@/lib/types/api'
import { DoorKnock, DoorKnockInsert, DoorKnockUpdate } from '@/lib/types/door-knocks'

/**
 * Create a new door knock pin
 */
export async function createDoorKnock(
  companyId: string,
  data: DoorKnockInsert
): Promise<ApiResponse<DoorKnock>>

/**
 * Get door knocks with filters
 */
export async function getDoorKnocks(
  companyId: string,
  filters: {
    locationId?: string
    userId?: string      // For "My Pins" filter
    teamUserIds?: string[] // For team view
    pinType?: PinType | PinType[]
    startDate?: string
    endDate?: string
    includeDeleted?: boolean
  }
): Promise<ApiResponse<DoorKnock[]>>

/**
 * Update pin type, notes, or callback date
 */
export async function updateDoorKnock(
  id: string,
  updates: DoorKnockUpdate
): Promise<ApiResponse<DoorKnock>>

/**
 * Soft delete a door knock pin
 */
export async function deleteDoorKnock(
  id: string
): Promise<ApiResponse<void>>

/**
 * Get analytics and statistics
 */
export async function getDoorKnockStats(
  companyId: string,
  filters: {
    locationId?: string
    userId?: string
    teamUserIds?: string[]
    startDate?: string
    endDate?: string
  }
): Promise<ApiResponse<{
  totalKnocks: number
  byType: Record<PinType, number>
  appointmentRate: number // appointments / total knocks
  byUser: Array<{
    userId: string
    userName: string
    userRole: string
    totalKnocks: number
    appointments: number
    conversionRate: number
    lastActivity: string
  }>
  byDate: Array<{
    date: string
    totalKnocks: number
    appointments: number
  }>
}>>

/**
 * Get upcoming callbacks (go_back pins with callback_date)
 */
export async function getUpcomingCallbacks(
  companyId: string,
  userId?: string,
  daysAhead: number = 7
): Promise<ApiResponse<DoorKnock[]>>
```

### Geocoding Service (lib/utils/geocoding.ts)

```typescript
/**
 * Reverse geocode coordinates to full address
 * Uses Google Geocoding API
 */
export async function reverseGeocode(
  lat: number, 
  lng: number
): Promise<{
  address: string
  city: string
  state: string
  zip: string
  formattedAddress: string
}>

/**
 * Forward geocode address to coordinates (for search)
 */
export async function geocodeAddress(
  address: string
): Promise<{
  lat: number
  lng: number
  formattedAddress: string
}>

/**
 * Batch geocode multiple pins (for performance)
 */
export async function batchReverseGeocode(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<Array<{
  lat: number
  lng: number
  address: string
  formattedAddress: string
}>>
```

### Performance Optimization: Pin Clustering

```typescript
// lib/utils/map-clustering.ts

/**
 * Cluster nearby pins for better map performance
 * Groups pins within ~100m radius when zoomed out
 */
export function clusterPins(
  pins: DoorKnock[],
  zoomLevel: number
): Array<{
  id: string
  lat: number
  lng: number
  count: number
  pins: DoorKnock[]
  primaryType: PinType // Most common pin type in cluster
}>

/**
 * Calculate cluster radius based on zoom level
 */
export function getClusterRadius(zoomLevel: number): number {
  // Zoom 1-5: 10km radius
  // Zoom 6-10: 1km radius
  // Zoom 11-15: 100m radius
  // Zoom 16+: No clustering
}
```

---

## 🎨 Frontend Components

### 1. Door Knocking Map Page

**Route:** `/admin/door-knocking`  
**File:** `app/(admin)/admin/door-knocking/page.tsx`

**Features:**
- Full-screen Google Map view
- Sidebar with filters and legend
- Click map to drop pin
- Click existing pin to view/edit
- Address search bar (geocoding)
- Toggle satellite/roadmap view
- Location selector (for users with multiple locations)
- Real-time pin clustering (performance)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ [≡] Door Knocking Map          [Location ▼] [Filter]│
├────────┬─────────────────────────────────────────────┤
│        │                                             │
│ LEGEND │                                             │
│        │                                             │
│ 🟢 18  │            GOOGLE MAP                       │
│ Appt   │                                             │
│        │          📍 📍 📍                           │
│ 🟡 42  │        📍       📍                          │
│ Not    │     📍              📍                      │
│ Home   │                                             │
│        │   📍      📍    📍                          │
│ 🔴 12  │                    📍                       │
│ Not    │                                             │
│ Int.   │                                             │
│        │                                             │
│ 🟠 8   │                                             │
│ Go     │                                             │
│ Back   │                                             │
│        │                                             │
│ ⚪ 3   │                                             │
│ Unq.   │                                             │
│        │                                             │
│ ─────  │                                             │
│ Total  │                                             │
│ 83     │                                             │
└────────┴─────────────────────────────────────────────┘
```

**Filters:**
- **View Scope:**
  - My Pins (default for reps)
  - My Team (for managers with permission)
  - All Location (for admins)
  
- **Date Range:**
  - Today
  - This Week
  - This Month
  - This Year
  - All Time
  - Custom Range
  
- **Pin Type:** (Multi-select)
  - All Types
  - Appointments Only
  - Not Home
  - Not Interested
  - Go Back
  - Unqualified

**Map Controls:**
- Search address bar (autocomplete)
- Satellite/Roadmap toggle
- Current location button (centers map on user's location)
- Cluster zoom (tap cluster to zoom in)
- Legend (toggleable sidebar)

### 2. Pin Modal

**File:** `components/admin/door-knocking/pin-modal.tsx`

**Triggers:**
1. User taps map → "Create Pin" modal
2. User taps existing pin → "Edit Pin" modal

**Create Pin Flow:**
```
┌─────────────────────────────────────┐
│ Drop Pin                         [X]│
├─────────────────────────────────────┤
│                                     │
│ 📍 123 Main St, Austin, TX 78701    │
│     (Auto-geocoded from tap)        │
│                                     │
│ Pin Type *                          │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 Not Home               ▼     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Notes                               │
│ ┌─────────────────────────────────┐ │
│ │ Truck in driveway, lights on... │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]              [Save Pin]    │
└─────────────────────────────────────┘
```

**Edit Pin Flow (with "Go Back" selected):**
```
┌─────────────────────────────────────┐
│ Edit Pin                         [X]│
├─────────────────────────────────────┤
│                                     │
│ 📍 123 Main St, Austin, TX 78701    │
│                                     │
│ Pin Type *                          │
│ ┌─────────────────────────────────┐ │
│ │ 🟠 Go Back                ▼     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Callback Date                       │
│ ┌─────────────────────────────────┐ │
│ │ 📅 January 20, 2026       ▼     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Notes                               │
│ ┌─────────────────────────────────┐ │
│ │ Homeowner asked to call back... │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Created: Jan 15, 2:34 PM            │
│                                     │
│ [Delete]  [Cancel]    [Update Pin]  │
└─────────────────────────────────────┘
```

**Edit Pin Flow (changed to Appointment):**
```
┌─────────────────────────────────────┐
│ Edit Pin                         [X]│
├─────────────────────────────────────┤
│                                     │
│ 📍 123 Main St, Austin, TX 78701    │
│                                     │
│ Pin Type *                          │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 Appointment            ▼     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Notes                               │
│ ┌─────────────────────────────────┐ │
│ │ Homeowner interested in full... │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 💡 This will create a lead and      │
│    schedule an appointment          │
│                                     │
│ Created: Jan 15, 2:34 PM            │
│                                     │
│ [Delete]  [Cancel]                  │
│          [Create Lead & Appointment]│
└─────────────────────────────────────┘
```

**Component Props:**
```typescript
interface PinModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  coordinates?: { lat: number; lng: number }
  existingPin?: DoorKnock
  onSave: (pin: DoorKnockInsert) => Promise<void>
  onUpdate: (id: string, updates: DoorKnockUpdate) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onConvertToLead: (pin: DoorKnock) => void
}
```

### 3. Lead Conversion Flow

**When user clicks "Create Lead & Appointment":**

**Step 1: Lead Form Modal**
```typescript
// Reuse existing lead-form.tsx component
// Pre-fill with door knock data:

const leadFormDefaults = {
  // From geocoded address
  address: doorKnock.address,
  city: geocodedData.city,
  state: geocodedData.state,
  zip: geocodedData.zip,
  
  // Auto-set source
  source: 'door_knocking',
  
  // Auto-assign based on user role
  sales_rep_id: user.role === 'sales' ? user.id : null,
  marketing_rep_id: user.role === 'marketing' ? user.id : null,
  sales_manager_id: user.sales_manager_id, // From user record
  
  // Location from current filter or user's primary location
  location_id: currentLocationFilter || user.default_location_id,
  
  // From door knock notes
  notes: doorKnock.notes,
}

// User fills:
// - full_name (required)
// - phone (required)
// - email (optional)
// - service_type (required)
// - priority (default: 'medium')
```

**Step 2: On Lead Save → Appointment Form Modal**
```typescript
// Automatically open appointment form
// Pre-fill with lead data:

const appointmentDefaults = {
  lead_id: newLead.id,
  
  // Default to tomorrow, 10am
  start_time: addDays(new Date(), 1).setHours(10, 0, 0, 0),
  duration: 60, // 1 hour
  
  // Auto-assign based on lead assignments
  assigned_users: [
    newLead.sales_rep_id,
    newLead.marketing_rep_id,
  ].filter(Boolean),
  
  // Event type
  event_type: 'estimate',
  
  // Location
  location: newLead.address,
}

// User can adjust:
// - Date/time
// - Duration
// - Assigned users
// - Event type
// - Notes
```

**Step 3: On Appointment Save**
```typescript
// 1. Update door_knock record
await updateDoorKnock(doorKnock.id, {
  lead_id: newLead.id,
  pin_type: 'appointment', // Ensure it's marked as appointment
})

// 2. Invalidate queries for real-time updates
queryClient.invalidateQueries(['door-knocks'])
queryClient.invalidateQueries(['leads'])
queryClient.invalidateQueries(['calendar-events'])

// 3. Success notification
toast.success('Appointment scheduled! Lead added to pipeline.')

// 4. Close all modals
// 5. Refresh map (pin now shows as green appointment)
```

### 4. Analytics Dashboard

**Route:** `/admin/door-knocking/analytics`  
**File:** `app/(admin)/admin/door-knocking/analytics/page.tsx`  
**Permission:** `can_view_door_knock_analytics`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Door Knocking Analytics                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Filters: [Location: All ▼] [Date: This Month ▼] [Export ▼]│
│                                                             │
│ ┌────────────┬────────────┬────────────┬────────────┐      │
│ │Total Knocks│Appointments│Conversion  │Not Home    │      │
│ │    247     │     18     │   7.3%     │   42%      │      │
│ └────────────┴────────────┴────────────┴────────────┘      │
│                                                             │
│ Performance Trend (Last 30 Days)                            │
│ ┌───────────────────────────────────────────────────────┐  │
│ │                                                  ┌─┐  │  │
│ │                                             ┌─┐  │ │  │  │
│ │                                        ┌─┐  │ │  │ │  │  │
│ │                                   ┌─┐  │ │  │ │  │ │  │  │
│ │ ────────────────────────────────────────────────────  │  │
│ │ Jan 1    Jan 8    Jan 15   Jan 22   Jan 29          │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Team Performance                                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │User        │Knocks│Appts│Conv %│Last Activity     │    │
│ ├────────────┼──────┼─────┼──────┼──────────────────┤    │
│ │John Smith  │  89  │  8  │ 9.0% │ 2 hours ago      │    │
│ │Jane Doe    │  76  │  6  │ 7.9% │ 4 hours ago      │    │
│ │Bob Lee     │  82  │  4  │ 4.9% │ Yesterday        │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Pin Type Breakdown                                          │
│ ┌─────────────────┐ ┌───────────────────────────────┐      │
│ │                 │ │ 🟡 Not Home:      104 (42%)  │      │
│ │   PIE CHART     │ │ 🔴 Not Interested: 67 (27%)  │      │
│ │                 │ │ 🟠 Go Back:        38 (15%)  │      │
│ │                 │ │ ⚪ Unqualified:     20 (8%)   │      │
│ └─────────────────┘ │ 🟢 Appointment:    18 (7%)   │      │
│                     └───────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Export Options:**
- CSV (raw data)
- PDF (formatted report)
- Filter options: User, Location, Date Range

---

## 📱 Mobile Optimization

### Critical Requirements

1. **Responsive Design:**
   - Full-screen map on mobile
   - Bottom sheet modals (not center)
   - Collapsible legend sidebar
   - Large touch targets (44x44px minimum)

2. **Touch Gestures:**
   - Tap pin to view/edit
   - Long-press map to drop pin
   - Pinch to zoom
   - Swipe legend to collapse

3. **Performance:**
   - **Pin Clustering:** Group pins when >50 visible
   - **Lazy Loading:** Load pins in viewport only
   - **Debounced Geocoding:** Batch reverse geocode requests
   - **Image Optimization:** Use WebP for map tiles
   - **Cache Map Tiles:** Service worker caching

4. **Location Tracking:**
   - Request geolocation permission on first use
   - Track user's current location (blue dot on map)
   - "Center on Me" button to recenter map
   - Auto-update location as user moves
   - Cache last known location

5. **Network Handling:**
   - Show offline indicator
   - Queue pin saves when offline (future enhancement)
   - Retry failed requests
   - Loading states for geocoding

### Clustering Implementation

```typescript
// When zoom level < 15 and pins > 50
const clusteredPins = useMemo(() => {
  if (zoomLevel >= 15 || pins.length < 50) {
    return pins // Show all individual pins
  }
  
  return clusterPins(pins, zoomLevel)
}, [pins, zoomLevel])

// Cluster marker
<Marker
  position={{ lat: cluster.lat, lng: cluster.lng }}
  icon={{
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: getClusterColor(cluster.primaryType),
    fillOpacity: 0.8,
    strokeColor: '#fff',
    strokeWeight: 2,
    scale: Math.min(15 + cluster.count, 30), // Scale by count
  }}
  label={{
    text: cluster.count.toString(),
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
  }}
  onClick={() => {
    // Zoom into cluster
    map.setZoom(zoomLevel + 3)
    map.panTo({ lat: cluster.lat, lng: cluster.lng })
  }}
/>
```

---

## 🔄 User Flows

### Flow 1: Drop a "Not Home" Pin

```
1. User opens /admin/door-knocking on mobile
2. Map loads, centered on user's current location (blue dot)
3. User walks to a house and knocks on door
4. No answer from homeowner
5. User taps map at the house location
6. Pin modal opens
7. Address auto-fills: "123 Oak St, Austin, TX"
8. User selects "Not Home" from dropdown (yellow)
9. User types note: "Doorbell not working, knocked loudly"
10. User taps "Save Pin"
11. Yellow pin appears on map at that location
12. Toast: "Pin saved"
13. Modal closes
14. User walks to next house
```

### Flow 2: Convert Pin to Appointment

```
1. User knocks on door
2. Homeowner answers and is interested in roof estimate
3. User taps map at house location
4. Pin modal opens with geocoded address
5. User selects "Appointment" from dropdown (green)
6. User types note: "Interested in full roof replacement, asphalt shingles"
7. User taps "Create Lead & Appointment"
8. Pin modal closes
9. Lead Form modal opens with:
   - Address: "456 Elm St, Austin, TX 78704" (pre-filled)
   - Source: "door_knocking" (pre-filled)
   - Sales Rep: "John Smith" (pre-filled)
   - Location: "Austin - North" (pre-filled)
10. User enters:
    - Name: "Sarah Johnson"
    - Phone: "512-555-0123"
    - Email: "sarah@example.com"
    - Service Type: "Roof Replacement"
11. User taps "Save Lead"
12. Lead created, modal closes
13. Appointment Form modal opens with:
    - Lead: "Sarah Johnson - 456 Elm St" (read-only)
    - Date: Tomorrow (default)
    - Time: 2:00 PM
    - Duration: 1 hour
    - Assigned: John Smith (pre-filled)
    - Event Type: Estimate
14. User taps "Save Appointment"
15. Appointment created
16. All modals close
17. Map refreshes: Green pin appears at location
18. Toast: "Appointment scheduled! Lead added to pipeline."
19. User continues to next house
```

### Flow 3: Change Pin from "Not Home" to "Appointment"

```
1. User previously dropped "Not Home" pin at 123 Oak St
2. User returns to house 2 hours later
3. User taps existing yellow pin on map
4. Pin modal opens showing:
   - Type: "Not Home"
   - Note: "Doorbell not working, knocked loudly"
   - Created: "2 hours ago"
5. Homeowner is now home and interested
6. User changes dropdown to "Appointment" (green)
7. User updates note: "Homeowner now home, wants estimate"
8. "Create Lead & Appointment" button appears
9. User taps button
10. (Follow Flow 2, steps 9-18)
```

### Flow 4: Set Callback for "Go Back" Pin

```
1. User knocks on door
2. Teenager answers, says parents will be home after 6pm
3. User taps map at house location
4. Pin modal opens
5. User selects "Go Back" from dropdown (orange)
6. Callback Date field appears
7. User selects "Today, 6:30 PM" from date picker
8. User types note: "Spoke with son, parents home after 6pm"
9. User taps "Save Pin"
10. Orange pin appears on map
11. Pin added to "Upcoming Callbacks" list
12. User receives reminder notification at 6:00 PM
```

---

## 🚀 Implementation Phases

### Phase 1: Database & Permissions (2 hours)

- [ ] Create migration file: `20260115000001_door_knocking_feature.sql`
- [ ] Add `door_knock_enabled` to `companies` table
- [ ] Update `leads.source` constraint to include 'door_knocking'
- [ ] Create `door_knocks` table with all indexes
- [ ] Add RLS policies
- [ ] Add 4 new permissions to `user_permissions` table
- [ ] Update `DEFAULT_ROLE_PERMISSIONS` in TypeScript types
- [ ] Test migration in development

### Phase 2: Backend API (4 hours)

- [ ] Create TypeScript types (`lib/types/door-knocks.ts`)
- [ ] Create API functions (`lib/api/door-knocks.ts`)
  - [ ] createDoorKnock()
  - [ ] getDoorKnocks() with filters
  - [ ] updateDoorKnock()
  - [ ] deleteDoorKnock()
  - [ ] getDoorKnockStats()
  - [ ] getUpcomingCallbacks()
- [ ] Create Next.js API routes
  - [ ] `app/api/door-knocks/route.ts`
  - [ ] `app/api/door-knocks/[id]/route.ts`
  - [ ] `app/api/door-knocks/stats/route.ts`
- [ ] Create geocoding service (`lib/utils/geocoding.ts`)
  - [ ] reverseGeocode()
  - [ ] geocodeAddress()
  - [ ] batchReverseGeocode()
- [ ] Add React Query hooks (`lib/hooks/use-door-knocks.ts`)
- [ ] Test all API endpoints

### Phase 3: Map Page & Pin Dropping (6 hours)

- [ ] Create map page (`app/(admin)/admin/door-knocking/page.tsx`)
- [ ] Integrate Google Maps
  - [ ] Map display with satellite/roadmap toggle
  - [ ] User location tracking (blue dot)
  - [ ] Center on user location button
- [ ] Implement pin rendering
  - [ ] Color-coded markers based on pin type
  - [ ] Pin clustering for performance (>50 pins, zoom <15)
- [ ] Create pin modal component
  - [ ] Create mode (new pin)
  - [ ] Edit mode (existing pin)
  - [ ] Pin type selector with colors
  - [ ] Notes textarea
  - [ ] Callback date picker (for "go_back" type)
  - [ ] Delete button (edit mode)
- [ ] Implement geocoding on pin drop
- [ ] Add filters sidebar
  - [ ] Location selector
  - [ ] Date range presets + custom
  - [ ] Pin type multi-select
  - [ ] View scope (My/Team/All)
- [ ] Create legend component
  - [ ] Pin type counts
  - [ ] Color coding guide
- [ ] Permission gating (feature flag + user permissions)

### Phase 4: Lead Conversion (3 hours)

- [ ] Integrate lead form modal
  - [ ] Pre-fill address from geocoding
  - [ ] Auto-set source = 'door_knocking'
  - [ ] Auto-assign based on user role
  - [ ] Auto-set location from filter/user default
- [ ] Integrate appointment form modal
  - [ ] Pre-fill with lead data
  - [ ] Default date/time (tomorrow 10am)
  - [ ] Auto-assign users from lead
- [ ] Wire up "Create Lead & Appointment" flow
  - [ ] Pin modal → Lead form → Appointment form
  - [ ] Update door_knock.lead_id on success
  - [ ] Update door_knock.pin_type to 'appointment'
  - [ ] Invalidate queries for real-time updates
- [ ] Success notifications
- [ ] Error handling

### Phase 5: Analytics Dashboard (4 hours)

- [ ] Create analytics page (`app/(admin)/admin/door-knocking/analytics/page.tsx`)
- [ ] Permission check (`can_view_door_knock_analytics`)
- [ ] Build stats query functions
  - [ ] Total knocks, appointments, conversion rate
  - [ ] Breakdown by pin type
  - [ ] Team performance calculations
  - [ ] Date-based trending
- [ ] Create summary cards component
- [ ] Create performance trend chart (Recharts)
- [ ] Create team performance table
  - [ ] Sortable columns
  - [ ] User avatars
  - [ ] Last activity timestamps
- [ ] Create pin type breakdown chart (pie chart)
- [ ] Add filters (location, date range, user)
- [ ] CSV export functionality
- [ ] PDF report generation (future enhancement)

### Phase 6: Mobile Optimization & Polish (3 hours)

- [ ] Mobile responsive design
  - [ ] Bottom sheet modals
  - [ ] Collapsible legend
  - [ ] Touch-optimized controls
- [ ] Performance optimizations
  - [ ] Implement pin clustering
  - [ ] Lazy load pins in viewport
  - [ ] Debounce geocoding requests
  - [ ] Cache map tiles
- [ ] Loading states
  - [ ] Map loading spinner
  - [ ] Geocoding loading indicator
  - [ ] Pin save/update loading
- [ ] Error handling
  - [ ] Geocoding failures
  - [ ] Network errors
  - [ ] Permission denied (location)
- [ ] Success toasts
- [ ] Offline indicator
- [ ] Location tracking polish
  - [ ] Request permission flow
  - [ ] Center on location animation
  - [ ] Auto-update as user moves

### Phase 7: Testing & Deployment (2 hours)

- [ ] Unit tests for API functions
- [ ] Integration tests for pin creation flow
- [ ] E2E test for full conversion flow
- [ ] Test on mobile devices
- [ ] Test permission gating
- [ ] Test with large dataset (>500 pins)
- [ ] Performance testing (clustering)
- [ ] Test geocoding edge cases
- [ ] Run migration in production
- [ ] Enable feature for test company
- [ ] Monitor for errors
- [ ] User training/documentation

---

## ✅ Testing Checklist

### Functionality
- [ ] Drop pin at location (tap map)
- [ ] Pin appears with correct color based on type
- [ ] Edit existing pin (tap pin)
- [ ] Change pin type (e.g., Not Home → Appointment)
- [ ] Add/edit notes on pin
- [ ] Set callback date for "Go Back" pins
- [ ] Delete pin (soft delete)
- [ ] Convert to lead + appointment
- [ ] Lead auto-assigned correctly (marketing vs sales)
- [ ] Appointment created and linked to lead
- [ ] Pin.lead_id updated after conversion
- [ ] Filters work (location, date, type, user scope)
- [ ] Search address (geocoding)
- [ ] Toggle satellite/roadmap view
- [ ] Pin clustering activates (>50 pins, zoom <15)
- [ ] Analytics calculate correctly
- [ ] CSV export includes all data
- [ ] Upcoming callbacks list shows go_back pins

### Permissions
- [ ] Feature gated by `door_knock_enabled` company flag
- [ ] Map page requires `can_view_door_knocking_map`
- [ ] Pin creation requires `can_create_door_knocks`
- [ ] Team view requires `can_view_team_door_knocks`
- [ ] Analytics page requires `can_view_door_knock_analytics`
- [ ] Sales reps can create pins
- [ ] Marketing reps can create pins
- [ ] Managers can see team pins
- [ ] Reps only see own pins (unless manager)
- [ ] Production users cannot access feature

### Mobile
- [ ] Responsive layout on phone (< 768px)
- [ ] Touch targets large enough (44x44px)
- [ ] Bottom sheet modals work
- [ ] Legend collapsible on mobile
- [ ] Map controls accessible
- [ ] Forms usable on small screens
- [ ] Location permission request works
- [ ] Current location tracking works
- [ ] Pin clustering improves performance

### Edge Cases
- [ ] Geocoding fails gracefully (no address)
- [ ] Multiple pins at same location (cluster)
- [ ] Pin dropped without location permission
- [ ] Network offline (queue or error)
- [ ] Very old pins (>1 year) display correctly
- [ ] User with no assigned location
- [ ] Lead already exists at address (duplicate check)
- [ ] Callback date in past (validation)
- [ ] 500+ pins on map (clustering + performance)
- [ ] Rapid pin dropping (rate limiting)

### Performance
- [ ] Map loads in < 2 seconds
- [ ] Pin clustering reduces markers to <100
- [ ] Geocoding completes in < 1 second
- [ ] Filter changes respond instantly
- [ ] No memory leaks with long sessions
- [ ] Smooth panning/zooming with many pins

---

## 💡 Future Enhancements (Not in Scope)

### Phase 2 Features (Territory Management)
- Draw polygons for sales territories
- Auto-assign leads based on territory boundaries
- Territory performance metrics
- Territory overlap detection
- PostGIS spatial queries

### Additional Enhancements
- **Daily Goals:** Set target knocks per day, progress tracking
- **Heat Map View:** Identify high-activity neighborhoods
- **Route Planning:** Plot optimal path through addresses
- **Weather Integration:** Best times to knock recommendations
- **Offline Mode:** IndexedDB + background sync
- **Photo Attachments:** Add house photos to pins
- **Quick Actions:** Tap-to-call, tap-to-text buttons
- **Push Notifications:** Daily reminders, callback alerts
- **Gamification:** Leaderboards, achievements, badges
- **Duplicate Detection:** Warn if lead exists at address
- **Neighborhood Completion:** Mark areas as fully canvassed

---

## 🔒 Security Considerations

1. **RLS Policies:** Enforce `company_id` filtering on all queries
2. **Permission Checks:** Validate on both client and server
3. **Rate Limiting:** Max 10 pins per minute per user (prevent spam)
4. **Input Validation:** Sanitize notes field (XSS prevention)
5. **API Key Security:** 
   - Google Maps API key domain restrictions
   - Geocoding quota monitoring
   - Cache geocoded addresses (reduce API calls)
6. **Location Privacy:** 
   - User location only visible to user
   - No tracking of user movement history
   - Location data not stored (only pin coordinates)
7. **Data Isolation:** RLS ensures users only see company data
8. **Soft Deletes:** Pins never hard-deleted (audit trail)

---

## 📚 Technical Stack Summary

**Frontend:**
- Next.js 15 (App Router, React Server Components)
- @react-google-maps/api or @googlemaps/js-api-loader
- Tailwind CSS + shadcn/ui components
- TanStack Query (React Query) for state management
- Recharts for analytics visualizations

**Backend:**
- Next.js API Routes (app/api/*)
- Supabase PostgreSQL (no PostGIS needed)
- Supabase Auth with Row Level Security
- Server-side geocoding via Google Geocoding API

**Existing Integrations:**
- Lead management (reuse `lead-form.tsx`)
- Appointment system (reuse `calendar_events` table)
- Location system (reuse `locations`, `location_users`)
- Permission system (reuse `user_permissions`)
- Multi-tenant architecture (`company_id` on all tables)

**External APIs:**
- Google Maps JavaScript API (map display)
- Google Geocoding API (lat/lng → address)
- Google Places API (address search autocomplete)

**Performance:**
- Pin clustering (custom algorithm)
- Indexed queries (company_id, location_id, created_at)
- Debounced geocoding
- Lazy loading + viewport filtering

---

## 📖 Related Documentation

- Existing lead creation: `components/admin/leads/lead-form.tsx`
- Appointment system: `app/(admin)/admin/schedule/`
- Location management: `app/(admin)/admin/settings/locations/`
- Permission system: `lib/types/users.ts`, `lib/api/permissions.ts`
- Multi-tenant patterns: `.github/copilot-instructions.md`

---

**Last Updated:** January 15, 2026  
**Version:** 2.0.0 (Simplified)  
**Status:** Ready for Implementation  
**Estimated Completion:** 15-20 hours across 7 phases
