// Door Knock Map React Query Hooks
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDoorKnockPins,
  getDoorKnockPin,
  createDoorKnockPin,
  updateDoorKnockPin,
  deleteDoorKnockPin,
  getDoorKnockStats,
  getDoorKnockPinsInRadius,
  convertPinToLead,
  linkPinToAppointment,
} from '@/lib/api/door-knock';
import type {
  DoorKnockPinInsert,
  DoorKnockPinUpdate,
  DoorKnockFilters,
} from '@/lib/types/door-knock';
import { toast } from 'sonner';

/**
 * Hook to fetch all door knock pins
 */
export function useDoorKnockPins(companyId: string, filters?: DoorKnockFilters) {
  return useQuery({
    queryKey: ['door-knock-pins', companyId, filters],
    queryFn: async () => {
      const result = await getDoorKnockPins(companyId, filters);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to fetch a single door knock pin
 */
export function useDoorKnockPin(pinId: string) {
  return useQuery({
    queryKey: ['door-knock-pin', pinId],
    queryFn: async () => {
      const result = await getDoorKnockPin(pinId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!pinId,
  });
}

/**
 * Hook to fetch pins within a radius
 */
export function useDoorKnockPinsInRadius(
  companyId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 5.0,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['door-knock-pins-radius', companyId, latitude, longitude, radiusKm],
    queryFn: async () => {
      const result = await getDoorKnockPinsInRadius(companyId, latitude, longitude, radiusKm);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled && !!companyId && !!latitude && !!longitude,
  });
}

/**
 * Hook to fetch door knock statistics
 */
export function useDoorKnockStats(
  companyId: string,
  userId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['door-knock-stats', companyId, userId, startDate, endDate],
    queryFn: async () => {
      const result = await getDoorKnockStats(companyId, userId, startDate, endDate);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to create a door knock pin
 */
export function useCreateDoorKnockPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pin: DoorKnockPinInsert) => {
      const result = await createDoorKnockPin(pin);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['door-knock-pins', variables.company_id] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-stats', variables.company_id] });
      toast.success('Pin created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create pin');
    },
  });
}

/**
 * Hook to update a door knock pin
 */
export function useUpdateDoorKnockPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pinId, updates }: { pinId: string; updates: DoorKnockPinUpdate }) => {
      const result = await updateDoorKnockPin(pinId, updates);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['door-knock-pins'] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-pin', data?.id] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-stats'] });
      toast.success('Pin updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update pin');
    },
  });
}

/**
 * Hook to delete a door knock pin
 */
export function useDeleteDoorKnockPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pinId: string) => {
      const result = await deleteDoorKnockPin(pinId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['door-knock-pins'] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-stats'] });
      toast.success('Pin deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete pin');
    },
  });
}

/**
 * Hook to convert a pin to a lead
 */
export function useConvertPinToLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pinId, leadId }: { pinId: string; leadId: string }) => {
      const result = await convertPinToLead(pinId, leadId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['door-knock-pins'] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-pin', data?.id] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-stats'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Pin converted to lead successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to convert pin to lead');
    },
  });
}

/**
 * Hook to link a pin to an appointment
 */
export function useLinkPinToAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pinId, appointmentId }: { pinId: string; appointmentId: string }) => {
      const result = await linkPinToAppointment(pinId, appointmentId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['door-knock-pins'] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-pin', data?.id] });
      queryClient.invalidateQueries({ queryKey: ['door-knock-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Pin linked to appointment successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to link pin to appointment');
    },
  });
}

/**
 * Hook to get user's current location
 */
export function useUserLocation() {
  return useQuery({
    queryKey: ['user-location'],
    queryFn: async () => {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    },
    retry: 1,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: false,
  });
}
