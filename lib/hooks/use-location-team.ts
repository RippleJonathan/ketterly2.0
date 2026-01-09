'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { setLocationOfficeManager, getLocationOfficeManager, type SetLocationOfficeManagerParams } from '@/lib/api/location-users'
import { toast } from 'sonner'

interface LocationTeamMember {
  user_id: string
  location_id: string
  commission_enabled: boolean
  commission_rate: number | null
  commission_type: string | null
  flat_commission_amount: number | null
  paid_when: string | null
  include_own_sales: boolean
  team_lead_for_location: boolean
  users: {
    id: string
    full_name: string
    email: string
    role: string
  }
}

/**
 * Fetch all users assigned to a location
 */
export function useLocationTeam(locationId: string) {
  return useQuery({
    queryKey: ['location-team', locationId],
    queryFn: async () => {
      const supabase = createClient()
      
      // Specify the exact foreign key relationship to use
      // Fix: use 'location_users_user_id_fkey' instead of 'users!inner'
      const { data, error } = await supabase
        .from('location_users')
        .select(`
          user_id,
          location_id,
          commission_enabled,
          commission_rate,
          commission_type,
          flat_commission_amount,
          paid_when,
          include_own_sales,
          team_lead_for_location,
          users!location_users_user_id_fkey(
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('location_id', locationId)

      if (error) {
        console.error('Error fetching location team:', error)
        throw error
      }

      // Sort client-side (Supabase .order() doesn't work on joins)
      const sorted = (data || []).sort((a, b) => 
        a.users.full_name.localeCompare(b.users.full_name)
      )

      console.log('Location team data:', { locationId, count: sorted.length, users: sorted })

      return sorted as LocationTeamMember[]
    },
    enabled: !!locationId,
  })
}

/**
 * Remove a user from a location
 */
export function useRemoveUserFromLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, locationId }: { userId: string; locationId: string }) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('location_users')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId)

      if (error) throw error

      return { userId, locationId }
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['location-team', locationId] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('User removed from location')
    },
    onError: (error: Error) => {
      console.error('Error removing user from location:', error)
      toast.error('Failed to remove user from location')
    },
  })
}

interface UpdateCommissionSettingsParams {
  userId: string
  locationId: string
  commissionEnabled: boolean
  commissionRate: number | null
  commissionType: 'percentage' | 'flat_amount'
  flatCommissionAmount: number | null
  paidWhen: string
  includeOwnSales: boolean
}

/**
 * Update commission settings for a user at a location
 */
export function useUpdateCommissionSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateCommissionSettingsParams) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('location_users')
        .update({
          commission_enabled: params.commissionEnabled,
          commission_rate: params.commissionRate,
          commission_type: params.commissionType,
          flat_commission_amount: params.flatCommissionAmount,
          paid_when: params.paidWhen,
          include_own_sales: params.includeOwnSales,
        })
        .eq('user_id', params.userId)
        .eq('location_id', params.locationId)

      if (error) throw error

      return params
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['location-team', locationId] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Commission settings updated')
    },
    onError: (error: Error) => {
      console.error('Error updating commission settings:', error)
      toast.error('Failed to update commission settings')
    },
  })
}

/**
 * Get office manager for a location
 */
export function useLocationOfficeManager(locationId: string) {
  return useQuery({
    queryKey: ['location-office-manager', locationId],
    queryFn: () => getLocationOfficeManager(locationId),
    enabled: !!locationId,
  })
}

/**
 * Set office manager commission settings
 */
export function useSetLocationOfficeManager() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: SetLocationOfficeManagerParams) => setLocationOfficeManager(params),
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['location-office-manager', locationId] })
      queryClient.invalidateQueries({ queryKey: ['location-team', locationId] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Office manager settings updated')
    },
    onError: (error: Error) => {
      console.error('Error setting office manager:', error)
      toast.error('Failed to set office manager')
    },
  })
}

interface SetTeamLeadParams {
  locationId: string
  userId: string
  commissionRate: number
  paidWhen: string
  includeOwnSales: boolean
}

/**
 * Set Team Lead for a location (only one Team Lead per location)
 */
export function useSetTeamLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: SetTeamLeadParams) => {
      const supabase = createClient()

      // First, clear any existing Team Lead at this location
      await supabase
        .from('location_users')
        .update({
          team_lead_for_location: false,
          commission_enabled: false,
        })
        .eq('location_id', params.locationId)
        .eq('team_lead_for_location', true)

      // Then set the new Team Lead
      const { error } = await supabase
        .from('location_users')
        .update({
          team_lead_for_location: true,
          commission_enabled: true,
          commission_type: 'percentage',
          commission_rate: params.commissionRate,
          paid_when: params.paidWhen,
          include_own_sales: params.includeOwnSales,
        })
        .eq('location_id', params.locationId)
        .eq('user_id', params.userId)

      if (error) throw error

      return params
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['location-team', locationId] })
      queryClient.invalidateQueries({ queryKey: ['location-team-lead', locationId] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Team Lead set successfully')
    },
    onError: (error: Error) => {
      console.error('Error setting Team Lead:', error)
      toast.error('Failed to set Team Lead')
    },
  })
}

/**
 * Get Team Lead for a location
 */
export function useLocationTeamLead(locationId: string) {
  return useQuery({
    queryKey: ['location-team-lead', locationId],
    queryFn: async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('location_users')
        .select(`
          user_id,
          location_id,
          commission_rate,
          paid_when,
          include_own_sales,
          users!location_users_user_id_fkey(
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('location_id', locationId)
        .eq('team_lead_for_location', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.error('Error fetching team lead:', error)
        throw error
      }

      return data
    },
    enabled: !!locationId,
  })
}
