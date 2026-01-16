'use client';

import { useState, useCallback } from 'react';
import { GoogleMapComponent } from './google-map';
import { PinModal } from './pin-modal';
import { LeadFormFromPin } from './lead-form-from-pin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] md:h-[calc(100vh-64px)] m-0.5">
      <GoogleMapComponent
        pins={filteredPins}
        userLocation={userLocation ? {
          lat: userLocation.coords.latitude,
          lng: userLocation.coords.longitude,
        } : null}
        onMapClick={handleMapClick}
        onPinClick={handlePinClick}
      />

      {/* Pin Filter Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant={showOnlyMyPins ? "default" : "secondary"}
          size="sm"
          className="shadow-lg"
          onClick={() => setShowOnlyMyPins(!showOnlyMyPins)}
        >
          {showOnlyMyPins ? 'My Pins' : 'All Pins'}
        </Button>
      </div>

      {/* Legend Button - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="shadow-lg">
              <Info className="w-4 h-4 mr-2" />
              Pin Legend
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Door Knock Pin Types</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                <div>
                  <p className="font-medium">Appointment Set</p>
                  <p className="text-xs text-muted-foreground">Scheduled appointment with homeowner</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                <div>
                  <p className="font-medium">Follow Up</p>
                  <p className="text-xs text-muted-foreground">Needs follow-up contact</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                <div>
                  <p className="font-medium">Not Home</p>
                  <p className="text-xs text-muted-foreground">No one answered</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                <div>
                  <p className="font-medium">Not Interested</p>
                  <p className="text-xs text-muted-foreground">Declined service</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                <div>
                  <p className="font-medium">Unqualified</p>
                  <p className="text-xs text-muted-foreground">Does not meet criteria</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#000000' }}></div>
                <div>
                  <p className="font-medium">Do Not Contact</p>
                  <p className="text-xs text-muted-foreground">Requested no further contact</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
