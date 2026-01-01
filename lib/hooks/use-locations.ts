import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentCompany } from './use-current-company'
import {
  getLocations,
  getLocation,
  getPrimaryLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  setPrimaryLocation,
  getLocationSupplierPricing,
  setLocationSupplierPrice,
  removeLocationSupplierPrice,
  getMaterialEffectivePrice,
  type Location,
  type LocationInsert,
  type LocationUpdate,
  type SupplierMaterialPrice,
  type SupplierMaterialPriceInsert,
} from '@/lib/api/locations'
import { toast } from 'sonner'

// Get all locations for current company
export function useLocations(activeOnly = false) {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: ['locations', company?.id, activeOnly],
    queryFn: () => getLocations(company!.id, activeOnly),
    enabled: !!company?.id,
  })
}

// Get single location
export function useLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location', locationId],
    queryFn: () => getLocation(locationId!),
    enabled: !!locationId,
  })
}

// Get primary location
export function usePrimaryLocation() {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: ['primary-location', company?.id],
    queryFn: () => getPrimaryLocation(company!.id),
    enabled: !!company?.id,
  })
}

// Create location
export function useCreateLocation() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (location: LocationInsert) => createLocation(location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['primary-location', company?.id] })
      toast.success('Location created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create location: ${error.message}`)
    },
  })
}

// Update location
export function useUpdateLocation() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (location: LocationUpdate) => updateLocation(location),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['locations', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['location', result.data?.id] })
      queryClient.invalidateQueries({ queryKey: ['primary-location', company?.id] })
      toast.success('Location updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update location: ${error.message}`)
    },
  })
}

// Delete location
export function useDeleteLocation() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (locationId: string) => deleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['primary-location', company?.id] })
      toast.success('Location deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete location: ${error.message}`)
    },
  })
}

// Set primary location
export function useSetPrimaryLocation() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: ({ locationId }: { locationId: string }) => 
      setPrimaryLocation(locationId, company!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['primary-location', company?.id] })
      toast.success('Primary location updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to set primary location: ${error.message}`)
    },
  })
}

// =============================================
// Supplier Material Pricing Hooks
// =============================================

// Get supplier pricing for a location
export function useLocationSupplierPricing(
  locationId: string | undefined,
  supplierId?: string
) {
  return useQuery({
    queryKey: ['location-supplier-pricing', locationId, supplierId],
    queryFn: () => getLocationSupplierPricing(locationId!, supplierId),
    enabled: !!locationId,
  })
}

// Set supplier material price
export function useSetLocationSupplierPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SupplierMaterialPriceInsert) => 
      setLocationSupplierPrice(data),
    onSuccess: (result, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        queryKey: ['location-supplier-pricing', variables.location_id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['location-supplier-pricing', variables.location_id, variables.supplier_id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['material-price', variables.material_id] 
      })
      toast.success('Supplier price updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update supplier price: ${error.message}`)
    },
  })
}

// Remove supplier material price
export function useRemoveLocationSupplierPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ priceId, locationId }: { priceId: string; locationId: string }) => 
      removeLocationSupplierPrice(priceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['location-supplier-pricing', variables.locationId] 
      })
      toast.success('Supplier price removed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove supplier price: ${error.message}`)
    },
  })
}

// Get effective material price (with waterfall)
export function useMaterialEffectivePrice(
  materialId: string | undefined,
  locationId: string | undefined,
  supplierId?: string
) {
  return useQuery({
    queryKey: ['material-price', materialId, locationId, supplierId],
    queryFn: () => getMaterialEffectivePrice(materialId!, locationId!, supplierId),
    enabled: !!materialId && !!locationId,
  })
}
