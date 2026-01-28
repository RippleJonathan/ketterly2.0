'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMapComponent } from './google-map';
import { PinModal } from './pin-modal';
import { LeadFormFromPin } from './lead-form-from-pin';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, MapPin, Navigation, Search, Map } from 'lucide-react';
import { useDoorKnockPins, useCreateDoorKnockPin, useUpdateDoorKnockPin, useDeleteDoorKnockPin, useUserLocation } from '@/lib/hooks/use-door-knock';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import type { DoorKnockPinWithUser, DoorKnockPinInsert } from '@/lib/types/door-knock';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function DoorKnockingClient() {
  const { data: user } = useCurrentUser();
  const { data: userLocation } = useUserLocation();
  const [showOnlyMyPins, setShowOnlyMyPins] = useState(false);
  const { data: pins, isLoading } = useDoorKnockPins(user?.data?.company_id || '', {});
  
  const createPin = useCreateDoorKnockPin();
  const updatePin = useUpdateDoorKnockPin();
  const deletePin = useDeleteDoorKnockPin();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedPin, setSelectedPin] = useState<DoorKnockPinWithUser | undefined>();
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadFormPin, setLeadFormPin] = useState<DoorKnockPinWithUser | undefined>();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('satellite');
  
  // Address search state
  const [addressSearch, setAddressSearch] = useState('');
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Filter pins based on user selection
  const filteredPins = showOnlyMyPins
    ? (pins || []).filter(pin => pin.created_by === user?.data?.id)
    : (pins || []);

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
    if (!user?.data) return;

    if (modalMode === 'create') {
      await createPin.mutateAsync({
        ...pinData,
        company_id: user.data.company_id,
        created_by: user.data.id,
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
    setLeadFormPin(pin);
    setLeadFormOpen(true);
    setModalOpen(false);
  };

  const handleLeadFormClose = () => {
    setLeadFormOpen(false);
    setLeadFormPin(undefined);
  };

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!addressInputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(addressInputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        if (mapInstance) {
          mapInstance.panTo({ lat, lng });
          mapInstance.setZoom(18);
        }
        
        setAddressSearch(place.formatted_address || '');
        toast.success('Location found');
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [mapInstance]);

  const handleLocationToggle = () => {
    if (!isTracking && mapInstance && userLocation) {
      // When enabling tracking, center and zoom in
      mapInstance.panTo({
        lat: userLocation.coords.latitude,
        lng: userLocation.coords.longitude,
      });
      mapInstance.setZoom(18);
    }
    setIsTracking(!isTracking);
  };

  const handleMapTypeToggle = () => {
    const newType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(newType);
    if (mapInstance) {
      mapInstance.setMapTypeId(newType);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMapComponent
        pins={filteredPins}
        userLocation={userLocation ? {
          lat: userLocation.coords.latitude,
          lng: userLocation.coords.longitude,
        } : null}
        onMapClick={handleMapClick}
        onPinClick={handlePinClick}
        isTracking={isTracking}
        onMapLoad={setMapInstance}
      />

      {/* Unified Controls Sheet - Mobile Optimized */}
      <div className="absolute top-4 left-4 lg:left-72 z-[1000]">
        <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="shadow-lg h-9 w-9">
              <Settings className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[90vw] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Map Controls</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-4">
              {/* Address Search */}
              <div className="space-y-2">
                <Label htmlFor="address-search" className="text-base font-semibold">
                  <Search className="w-4 h-4 inline mr-2" />
                  Search Address
                </Label>
                <Input
                  id="address-search"
                  ref={addressInputRef}
                  type="text"
                  placeholder="Enter an address..."
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Start typing to see suggestions
                </p>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Map Type Toggle */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  <Map className="w-4 h-4 inline mr-2" />
                  Map View
                </Label>
                <Button
                  variant={mapType === 'satellite' ? "default" : "outline"}
                  size="sm"
                  onClick={handleMapTypeToggle}
                  className="w-full"
                >
                  {mapType === 'satellite' ? 'Satellite View' : 'Road Map View'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Switch between {mapType === 'satellite' ? 'road map' : 'satellite'} view
                </p>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Location Tracking */}
              {userLocation && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    <Navigation className="w-4 h-4 inline mr-2" />
                    My Location
                  </Label>
                  <Button
                    variant={isTracking ? "default" : "outline"}
                    size="sm"
                    onClick={handleLocationToggle}
                    className="w-full"
                  >
                    {isTracking ? (
                      <>
                        <Navigation className="w-4 h-4 mr-2 animate-pulse" />
                        Following Location
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 mr-2" />
                        Follow My Location
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {isTracking 
                      ? 'Map will follow your location and zoom in' 
                      : 'Enable to center map on your location'}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t" />

              {/* Pin Filter Toggle */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Pin Filter
                </Label>
                <Button
                  variant={showOnlyMyPins ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyMyPins(!showOnlyMyPins)}
                  className="w-full"
                >
                  {showOnlyMyPins ? 'Showing My Pins Only' : 'Showing All Pins'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Toggle to {showOnlyMyPins ? 'show all team pins' : 'show only your pins'}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Pin Legend */}
              <div className="space-y-2">
                <Label className="text-base font-semibold mb-3 block">Pin Legend</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                    <div>
                      <p className="font-medium text-sm">Appointment Set</p>
                      <p className="text-xs text-muted-foreground">Scheduled appointment</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                    <div>
                      <p className="font-medium text-sm">Follow Up</p>
                      <p className="text-xs text-muted-foreground">Needs follow-up</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                    <div>
                      <p className="font-medium text-sm">Not Home</p>
                      <p className="text-xs text-muted-foreground">No answer</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                    <div>
                      <p className="font-medium text-sm">Not Interested</p>
                      <p className="text-xs text-muted-foreground">Declined service</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                    <div>
                      <p className="font-medium text-sm">Unqualified</p>
                      <p className="text-xs text-muted-foreground">Doesn't meet criteria</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#000000' }}></div>
                    <div>
                      <p className="font-medium text-sm">Do Not Contact</p>
                      <p className="text-xs text-muted-foreground">No further contact</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
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

      <LeadFormFromPin
        isOpen={leadFormOpen}
        onClose={handleLeadFormClose}
        pin={leadFormPin}
      />
    </div>
  );
}
