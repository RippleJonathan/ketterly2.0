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
