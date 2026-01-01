import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllLocationUsers,
  getLocationUsers,
  getUserLocations,
  assignUserToLocation,
  removeUserFromLocation,
  updateLocationUserRole,
  type LocationUser,
  type LocationUserInsert,
  type LocationRole,
} from '@/lib/api/location-users'
import { toast } from 'sonner'
import { useCurrentCompany } from './use-current-company'

// Get all location-user assignments for the company
export function useAllLocationUsers() {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: ['all-location-users', company?.id],
    queryFn: () => getAllLocationUsers(company!.id),
    enabled: !!company?.id,
  })
}

// Get all users assigned to a location
export function useLocationUsers(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-users', locationId],
    queryFn: () => getLocationUsers(locationId!),
    enabled: !!locationId,
  })
}

// Get all locations for a user
export function useUserLocations(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-locations', userId],
    queryFn: () => getUserLocations(userId!),
    enabled: !!userId,
  })
}

// Assign user to location
export function useAssignUserToLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignment: LocationUserInsert) => assignUserToLocation(assignment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['location-users', variables.location_id] })
      queryClient.invalidateQueries({ queryKey: ['user-locations', variables.user_id] })
      toast.success('User assigned to location')
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign user: ${error.message}`)
    },
  })
}

// Remove user from location
export function useRemoveUserFromLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ locationUserId, locationId, userId }: { locationUserId: string; locationId: string; userId: string }) =>
      removeUserFromLocation(locationUserId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['location-users', variables.locationId] })
      queryClient.invalidateQueries({ queryKey: ['user-locations', variables.userId] })
      toast.success('User removed from location')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove user: ${error.message}`)
    },
  })
}

// Update user's role at location
export function useUpdateLocationUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ locationUserId, newRole }: { locationUserId: string; newRole: LocationRole }) =>
      updateLocationUserRole(locationUserId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-locations'] })
      toast.success('Role updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`)
    },
  })
}
