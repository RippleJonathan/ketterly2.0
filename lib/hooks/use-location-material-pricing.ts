import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/api'

// Types
export interface LocationMaterialPrice {
  id: string
  location_id: string
  material_id: string
  cost: number
  notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string
  materials?: {
    name: string
    unit: string
    unit_price: number
  }
}

export interface LocationMaterialPriceInsert {
  location_id: string
  material_id: string
  cost: number
  notes?: string
}

// API Functions
async function getLocationMaterialPricing(
  locationId: string
): Promise<ApiResponse<LocationMaterialPrice[]>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('location_material_pricing')
      .select(`
        *,
        materials:material_id (
          name,
          unit,
          current_cost
        )
      `)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data as LocationMaterialPrice[], error: null }
  } catch (error: any) {
    console.error('Error fetching location material pricing:', error)
    return { data: null, error: error.message }
  }
}

async function setLocationMaterialPrice(
  priceData: LocationMaterialPriceInsert
): Promise<ApiResponse<LocationMaterialPrice>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('location_material_pricing')
      .upsert(
        {
          location_id: priceData.location_id,
          material_id: priceData.material_id,
          cost: priceData.cost,
          notes: priceData.notes,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'location_id,material_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single()

    if (error) throw error
    return { data: data as LocationMaterialPrice, error: null }
  } catch (error: any) {
    console.error('Error setting location material price:', error)
    return { data: null, error: error.message }
  }
}

async function removeLocationMaterialPrice(
  priceId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('location_material_pricing')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', priceId)

    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    console.error('Error removing location material price:', error)
    return { data: null, error: error.message }
  }
}

// React Query Hooks
export function useLocationMaterialPricing(locationId: string) {
  return useQuery({
    queryKey: ['location-material-pricing', locationId],
    queryFn: () => getLocationMaterialPricing(locationId),
    enabled: !!locationId,
  })
}

export function useSetLocationMaterialPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setLocationMaterialPrice,
    onSuccess: (result, variables) => {
      if (result.error) {
        toast.error(result.error.toString())
        return
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['location-material-pricing', variables.location_id] })
      queryClient.invalidateQueries({ queryKey: ['material-price'] })
      
      toast.success('Location material price has been saved')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useRemoveLocationMaterialPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeLocationMaterialPrice,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error.toString())
        return
      }

      // Invalidate all location pricing queries
      queryClient.invalidateQueries({ queryKey: ['location-material-pricing'] })
      queryClient.invalidateQueries({ queryKey: ['material-price'] })
      
      toast.success('Price has been reset to base price')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
