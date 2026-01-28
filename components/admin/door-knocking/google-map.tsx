'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DoorKnockPinType, getPinColor } from '@/lib/types/door-knock';
import type { DoorKnockPinWithUser } from '@/lib/types/door-knock';

interface GoogleMapProps {
  pins: DoorKnockPinWithUser[];
  userLocation: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onPinClick: (pin: DoorKnockPinWithUser) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isTracking?: boolean;
  onMapLoad?: (map: google.maps.Map) => void;
}

export function GoogleMapComponent({
  pins,
  userLocation,
  onMapClick,
  onPinClick,
  center,
  zoom = 15,
  isTracking = false,
  onMapLoad,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);

  useEffect(() => {
    const initMap = async () => {
      // Load Google Maps JavaScript API
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      if (!mapRef.current) return;

      const defaultCenter = center || userLocation || { lat: 30.2672, lng: -97.7431 };

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom,
        mapTypeId: 'satellite',        // Default to satellite view
        mapTypeControl: false,         // Hide map/satellite toggle (moved to drawer)
        zoomControl: false,            // Remove + and - buttons
        streetViewControl: false,      // Remove street view pegman
        fullscreenControl: false,      // Remove fullscreen button
        rotateControl: false,          // Remove rotate 90° button
        scaleControl: false,           // Remove scale control
        keyboardShortcuts: false,      // Disable keyboard shortcuts
        gestureHandling: 'greedy',     // Allow single-finger map movement
        tilt: 0,                       // Disable tilt
      });

      mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });

      setMap(mapInstance);
      onMapLoad?.(mapInstance);
    };

    initMap();
  }, []);

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

    // Auto-center and zoom if tracking is enabled
    if (isTracking) {
      map.panTo(userLocation);
      map.setZoom(18);
    }

    return () => {
      marker.setMap(null);
    };
  }, [map, userLocation, isTracking]);

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

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
