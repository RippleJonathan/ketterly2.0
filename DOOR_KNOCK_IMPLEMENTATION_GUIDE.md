# Door Knock Feature - Complete Implementation Guide

## Status: Phases 3-7 Implementation

This document contains all the code you need to complete the door knock feature phases 3-7.

---

## Step 1: Create Directory Structure

Manually create these directories in your project:

```
components/
  admin/
    door-knocking/          <- CREATE THIS

app/
  (admin)/
    admin/
      door-knocking/        <- CREATE THIS
        analytics/          <- CREATE THIS
```

Or run this from your terminal:

```bash
# From project root
mkdir -p components/admin/door-knocking
mkdir -p app/\(admin\)/admin/door-knocking/analytics
```

---

## Step 2: Create Component Files

### File: `components/admin/door-knocking/google-map.tsx`

```typescript
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { DoorKnockPinType, getPinColor } from '@/lib/types/door-knock';
import type { DoorKnockPinWithUser } from '@/lib/types/door-knock';

interface GoogleMapProps {
  pins: DoorKnockPinWithUser[];
  userLocation: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onPinClick: (pin: DoorKnockPinWithUser) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export function GoogleMapComponent({
  pins,
  userLocation,
  onMapClick,
  onPinClick,
  center,
  zoom = 15,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
      });

      const { Map } = await loader.importLibrary('maps');

      if (!mapRef.current) return;

      const defaultCenter = center || userLocation || { lat: 30.2672, lng: -97.7431 };

      const mapInstance = new Map(mapRef.current, {
        center: defaultCenter,
        zoom,
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT,
        },
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });

      setMap(mapInstance);
    };

    initMap();
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!map || !userLocation) return;

    if (userMarker) {
      userMarker.setMap(null);
    }

    const marker = new google.maps.Marker({
      position: userLocation,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 10,
      },
      title: 'Your Location',
    });

    setUserMarker(marker);

    return () => {
      marker.setMap(null);
    };
  }, [map, userLocation]);

  // Update pin markers
  useEffect(() => {
    if (!map) return;

    markers.forEach(marker => marker.setMap(null));

    const newMarkers = pins.map(pin => {
      const marker = new google.maps.Marker({
        position: { lat: pin.latitude, lng: pin.longitude },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: getPinColor(pin.pin_type as DoorKnockPinType),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        },
        title: pin.address || `${pin.pin_type} pin`,
      });

      marker.addListener('click', () => {
        onPinClick(pin);
      });

      return marker;
    });

    setMarkers(newMarkers);

    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, pins, onPinClick]);

  const centerOnUser = useCallback(() => {
    if (map && userLocation) {
      map.panTo(userLocation);
      map.setZoom(17);
    }
  }, [map, userLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {userLocation && (
        <button
          onClick={centerOnUser}
          className="absolute bottom-6 right-6 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
          title="Center on my location"
        >
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

### File: `components/admin/door-knocking/pin-modal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DoorKnockPinType, PIN_TYPE_CONFIG, type DoorKnockPinInsert, type DoorKnockPinWithUser } from '@/lib/types/door-knock';
import { reverseGeocode } from '@/lib/utils/geocoding';
import { Loader2 } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  coordinates?: { lat: number; lng: number };
  existingPin?: DoorKnockPinWithUser;
  onSave: (pin: Partial<DoorKnockPinInsert>) => Promise<void>;
  onDelete?: (pinId: string) => Promise<void>;
  onConvertToLead?: (pin: DoorKnockPinWithUser) => void;
}

export function PinModal({
  isOpen,
  onClose,
  mode,
  coordinates,
  existingPin,
  onSave,
  onDelete,
  onConvertToLead,
}: PinModalProps) {
  const [pinType, setPinType] = useState<DoorKnockPinType>(
    existingPin?.pin_type as DoorKnockPinType || DoorKnockPinType.NOT_HOME
  );
  const [notes, setNotes] = useState(existingPin?.notes || '');
  const [address, setAddress] = useState(existingPin?.address || '');
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (mode === 'create' && coordinates && !address) {
      setGeocoding(true);
      reverseGeocode(coordinates.lat, coordinates.lng)
        .then(result => {
          if (result) {
            setAddress(result.formatted_address);
          }
        })
        .finally(() => setGeocoding(false));
    }
  }, [mode, coordinates, address]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        pin_type: pinType,
        notes: notes || null,
        address: address || null,
        ...(mode === 'create' && coordinates ? {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        } : {}),
      });
      onClose();
    } catch (error) {
      console.error('Error saving pin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingPin || !onDelete) return;
    if (!confirm('Are you sure you want to delete this pin?')) return;
    
    setLoading(true);
    try {
      await onDelete(existingPin.id);
      onClose();
    } catch (error) {
      console.error('Error deleting pin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToLead = () => {
    if (existingPin && onConvertToLead) {
      onConvertToLead(existingPin);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Drop New Pin' : 'Edit Pin'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {geocoding ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Getting address...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Address</Label>
                <p className="text-sm text-muted-foreground">{address || 'Unknown location'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin-type">Pin Type *</Label>
                <Select value={pinType} onValueChange={(value) => setPinType(value as DoorKnockPinType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PIN_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span style={{ color: config.color }}>● </span>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {PIN_TYPE_CONFIG[pinType]?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this interaction..."
                  rows={3}
                />
              </div>

              {mode === 'edit' && existingPin && (
                <div className="text-xs text-muted-foreground">
                  Created {new Date(existingPin.created_at).toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between">
          <div>
            {mode === 'edit' && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {mode === 'edit' && existingPin && pinType === DoorKnockPinType.LEAD_CREATED && onConvertToLead && (
              <Button onClick={handleConvertToLead} disabled={loading}>
                View Lead
              </Button>
            )}
            {mode === 'edit' && existingPin && pinType !== DoorKnockPinType.LEAD_CREATED && onConvertToLead && (
              <Button onClick={handleConvertToLead} disabled={loading}>
                Convert to Lead
              </Button>
            )}
            <Button onClick={handleSave} disabled={loading || geocoding}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `components/admin/door-knocking/map-legend.tsx`

```typescript
'use client';

import { PIN_TYPE_CONFIG, DoorKnockPinType } from '@/lib/types/door-knock';
import { Card } from '@/components/ui/card';

interface MapLegendProps {
  stats?: Record<DoorKnockPinType, number>;
}

export function MapLegend({ stats }: MapLegendProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Pin Legend</h3>
      <div className="space-y-2">
        {Object.entries(PIN_TYPE_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
            </div>
            {stats && (
              <span className="text-muted-foreground">
                {stats[key as DoorKnockPinType] || 0}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
```

### File: `app/(admin)/admin/door-knocking/page.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { GoogleMapComponent } from '@/components/admin/door-knocking/google-map';
import { PinModal } from '@/components/admin/door-knocking/pin-modal';
import { MapLegend } from '@/components/admin/door-knocking/map-legend';
import { useDoorKnockPins, useCreateDoorKnockPin, useUpdateDoorKnockPin, useDeleteDoorKnockPin, useUserLocation } from '@/lib/hooks/use-door-knock';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import type { DoorKnockPinWithUser, DoorKnockPinInsert } from '@/lib/types/door-knock';
import { Loader2 } from 'lucide-react';

export default function DoorKnockingPage() {
  const { data: user } = useCurrentUser();
  const { data: userLocation } = useUserLocation();
  const { data: pins, isLoading } = useDoorKnockPins(user?.company_id || '', {});
  
  const createPin = useCreateDoorKnockPin();
  const updatePin = useUpdateDoorKnockPin();
  const deletePin = useDeleteDoorKnockPin();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedPin, setSelectedPin] = useState<DoorKnockPinWithUser | undefined>();

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedCoordinates({ lat, lng });
    setSelectedPin(undefined);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handlePinClick = useCallback((pin: DoorKnockPinWithUser) => {
    setSelectedPin(pin);
    setSelectedCoordinates(undefined);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSavePin = async (pinData: Partial<DoorKnockPinInsert>) => {
    if (!user) return;

    if (modalMode === 'create') {
      await createPin.mutateAsync({
        ...pinData,
        company_id: user.company_id,
        created_by: user.id,
        interaction_date: new Date().toISOString(),
      } as DoorKnockPinInsert);
    } else if (selectedPin) {
      await updatePin.mutateAsync({
        pinId: selectedPin.id,
        updates: pinData,
      });
    }
  };

  const handleDeletePin = async (pinId: string) => {
    await deletePin.mutateAsync(pinId);
  };

  const handleConvertToLead = (pin: DoorKnockPinWithUser) => {
    // TODO: Implement lead conversion flow
    console.log('Convert to lead:', pin);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <GoogleMapComponent
          pins={pins || []}
          userLocation={userLocation ? {
            lat: userLocation.coords.latitude,
            lng: userLocation.coords.longitude,
          } : null}
          onMapClick={handleMapClick}
          onPinClick={handlePinClick}
        />
      </div>

      <div className="w-80 p-4 overflow-y-auto border-l">
        <MapLegend />
      </div>

      <PinModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        coordinates={selectedCoordinates}
        existingPin={selectedPin}
        onSave={handleSavePin}
        onDelete={handleDeletePin}
        onConvertToLead={handleConvertToLead}
      />
    </div>
  );
}
```

---

## Step 3: Update Navigation

Add to your admin sidebar navigation:

```typescript
{
  name: 'Door Knocking',
  href: '/admin/door-knocking',
  icon: MapPinIcon,
  permissions: ['can_view_door_knocking_map'],
}
```

---

## Step 4: Test

1. Navigate to `/admin/door-knocking`
2. Click on the map to drop a pin
3. Fill out the modal and save
4. Click on existing pins to edit them

---

## What's Completed:

- ✅ Phase 1: Database Schema (already done)
- ✅ Phase 2: API & Backend (already done)
- ✅ Phase 3: Map Page & Pin Dropping (in this file)
- 🔄 Phase 4: Lead Conversion (needs lead form integration)
- 🔄 Phase 5: Analytics Dashboard (create analytics page)
- 🔄 Phase 6: Mobile Optimization (CSS tweaks)
- 🔄 Phase 7: Testing (manual testing)

---

## Next: Run the Setup Script

Since the batch file didn't work, try running this in your terminal:

```bash
node setup-door-knock-dirs.js
```

Then manually create the component files listed above!
