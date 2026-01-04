'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface LocationTeamMember {
  user_id: string
  location_id: string
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
