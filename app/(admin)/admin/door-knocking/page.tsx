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
    // TODO: Implement lead conversion flow (Phase 4)
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
