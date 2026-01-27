'use client';

import { useState, useCallback } from 'react';
import { GoogleMapComponent } from './google-map';
import { PinModal } from './pin-modal';
import { LeadFormFromPin } from './lead-form-from-pin';
import { AddressSearch } from './address-search';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, MapPin } from 'lucide-react';
import { useDoorKnockPins, useCreateDoorKnockPin, useUpdateDoorKnockPin, useDeleteDoorKnockPin, useUserLocation } from '@/lib/hooks/use-door-knock';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import type { DoorKnockPinWithUser, DoorKnockPinInsert } from '@/lib/types/door-knock';
import { Loader2 } from 'lucide-react';

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
  const [zoomToLocation, setZoomToLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  const handleAddressSelect = (lat: number, lng: number, address: string) => {
    setZoomToLocation({ lat, lng });
    // Reset after zoom to allow re-zooming to same location
    setTimeout(() => setZoomToLocation(null), 100);
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
        zoomToLocation={zoomToLocation}
      />

      {/* Address Search - Desktop: Top Center, Mobile: Top Right - Hidden when modals open */}
      {!modalOpen && !leadFormOpen && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 hidden lg:block">
          <AddressSearch onAddressSelect={handleAddressSelect} />
        </div>
      )}

      {/* Address Search Button - Mobile Only - Hidden when modals open */}
      {!modalOpen && !leadFormOpen && (
        <div className="absolute top-4 right-4 z-10 lg:hidden">
          <AddressSearch onAddressSelect={handleAddressSelect} isMobile />
        </div>
      )}

      {/* Controls Button - Fixed to bottom-left corner of map - Hidden when modals open */}
      {!modalOpen && !leadFormOpen && (
        <div className="absolute bottom-6 left-4 lg:left-72 z-10">
        <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="shadow-lg">
              <Info className="w-4 h-4 mr-2" />
              Controls
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Map Controls</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Pin Filter Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pin Filter</p>
                  <p className="text-sm text-muted-foreground">Show only your pins or all location pins</p>
                </div>
                <Button
                  variant={showOnlyMyPins ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyMyPins(!showOnlyMyPins)}
                >
                  {showOnlyMyPins ? 'My Pins' : 'All Pins'}
                </Button>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Pin Legend */}
              <div>
                <p className="font-medium mb-3">Pin Legend</p>
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
          </DialogContent>
        </Dialog>
        </div>
      )}

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
