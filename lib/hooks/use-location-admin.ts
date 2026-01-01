import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './use-current-user'
import { useUserLocations } from './use-location-users'

/**
 * Check if current user is a location admin (can manage their assigned locations)
 * but NOT a company-wide admin
 */
export function useIsLocationAdmin() {
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const { data: userLocations } = useUserLocations(user?.id)
  
  console.log('🔍 useIsLocationAdmin Debug:', {
    user: user ? { id: user.id, email: user.email, role: user.role, default_location_id: user.default_location_id } : null,
    userLocations,
    userLocationsData: userLocations?.data,
    userLocationsCount: userLocations?.data?.length || 0
  })
  
  return useQuery({
    queryKey: ['is-location-admin', user?.id],
    queryFn: () => {
      if (!user) return { isLocationAdmin: false, locations: [] }
      
      // Only admin/super_admin are company-wide (office is location-scoped)
      const isCompanyAdmin = ['admin', 'super_admin'].includes(user.role as string)
      if (isCompanyAdmin) {
        return { isLocationAdmin: false, isCompanyAdmin: true, locations: [] }
      }
      
      // Office users are location admins for their assigned locations
      if (user.role === 'office') {
        const officeLocations = userLocations?.data || []
        return {
          isLocationAdmin: officeLocations.length > 0,
          isCompanyAdmin: false,
          locations: officeLocations.map((ul: any) => ul.location_id),
          adminLocationDetails: officeLocations,
        }
      }
      
      // Check if they have location_admin role at any location
      const adminLocations = userLocations?.data?.filter(
        (ul: any) => ul.location_role === 'location_admin'
      ) || []
      
      return {
        isLocationAdmin: adminLocations.length > 0,
        isCompanyAdmin: false,
        locations: adminLocations.map((ul: any) => ul.location_id),
        adminLocationDetails: adminLocations,
      }
    },
    enabled: !!user && !!userLocations,
  })
}

/**
 * Get all locations the current user can manage
 * (either all locations for company admins, or their assigned locations for location admins)
 */
export function useManagedLocations() {
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const { data: locationAdminData } = useIsLocationAdmin()
  
  console.log('🏢 useManagedLocations Debug:', {
    user: user ? { id: user.id, email: user.email, role: user.role, default_location_id: user.default_location_id } : null,
    locationAdminData,
    managedLocationIds: locationAdminData?.locations || []
  })
  
  return {
    isCompanyAdmin: locationAdminData?.isCompanyAdmin || false,
    isLocationAdmin: locationAdminData?.isLocationAdmin || false,
    managedLocationIds: locationAdminData?.locations || [],
  }
}
