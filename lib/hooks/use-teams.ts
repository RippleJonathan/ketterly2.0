// Teams management hooks
// File: lib/hooks/use-teams.ts

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Team {
  id: string
  company_id: string
  location_id: string
  name: string
  team_lead_id: string | null
  commission_rate: number
  paid_when: string
  include_own_sales: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  team_lead?: {
    id: string
    full_name: string
    email: string
    role: string
  }
  member_count?: number
}

interface TeamMember {
  user_id: string
  team_id: string
  users: {
    id: string
    full_name: string
    email: string
    role: string
  }
}

/**
 * Fetch all teams for a location
 */
export function useLocationTeams(locationId: string) {
  return useQuery({
    queryKey: ['teams', locationId],
    queryFn: async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          company_id,
          location_id,
          name,
          team_lead_id,
          commission_rate,
          paid_when,
          include_own_sales,
          is_active,
          created_at,
          updated_at,
          team_lead:users!teams_team_lead_id_fkey(
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('location_id', locationId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching teams:', error)
        throw error
      }

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        (data || []).map(async (team) => {
          const { count } = await supabase
            .from('location_users')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          return {
            ...team,
            member_count: count || 0
          }
        })
      )

      return teamsWithCounts as Team[]
    },
    enabled: !!locationId,
  })
}

/**
 * Fetch members of a team
 */
export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('location_users')
        .select(`
          user_id,
          team_id,
          users!location_users_user_id_fkey(
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('team_id', teamId)

      if (error) {
        console.error('Error fetching team members:', error)
        throw error
      }

      return (data || []) as TeamMember[]
    },
    enabled: !!teamId,
  })
}

interface CreateTeamParams {
  companyId: string
  locationId: string
  name: string
  teamLeadId: string | null
  commissionRate: number
  paidWhen: string
  includeOwnSales: boolean
}

/**
 * Create a new team
 */
export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateTeamParams) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('teams')
        .insert({
          company_id: params.companyId,
          location_id: params.locationId,
          name: params.name,
          team_lead_id: params.teamLeadId,
          commission_rate: params.commissionRate,
          paid_when: params.paidWhen,
          include_own_sales: params.includeOwnSales,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', locationId] })
      toast.success('Team created successfully')
    },
    onError: (error: Error) => {
      console.error('Error creating team:', error)
      toast.error(`Failed to create team: ${error.message}`)
    },
  })
}

interface UpdateTeamParams {
  teamId: string
  locationId: string
  name?: string
  teamLeadId?: string | null
  commissionRate?: number
  paidWhen?: string
  includeOwnSales?: boolean
  isActive?: boolean
}

/**
 * Update a team
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateTeamParams) => {
      const supabase = createClient()

      const updates: any = {}
      if (params.name !== undefined) updates.name = params.name
      if (params.teamLeadId !== undefined) updates.team_lead_id = params.teamLeadId
      if (params.commissionRate !== undefined) updates.commission_rate = params.commissionRate
      if (params.paidWhen !== undefined) updates.paid_when = params.paidWhen
      if (params.includeOwnSales !== undefined) updates.include_own_sales = params.includeOwnSales
      if (params.isActive !== undefined) updates.is_active = params.isActive

      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', params.teamId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', locationId] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast.success('Team updated successfully')
    },
    onError: (error: Error) => {
      console.error('Error updating team:', error)
      toast.error(`Failed to update team: ${error.message}`)
    },
  })
}

/**
 * Delete a team (soft delete)
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ teamId, locationId }: { teamId: string; locationId: string }) => {
      const supabase = createClient()

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('teams')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', teamId)

      if (error) throw error
      return { teamId, locationId }
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', locationId] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      toast.success('Team deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Error deleting team:', error)
      toast.error(`Failed to delete team: ${error.message}`)
    },
  })
}

/**
 * Add a user to a team
 */
export function useAddTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, teamId, locationId }: { userId: string; teamId: string; locationId: string }) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('location_users')
        .update({ team_id: teamId })
        .eq('user_id', userId)
        .eq('location_id', locationId)

      if (error) throw error
      return { userId, teamId, locationId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.teamId] })
      queryClient.invalidateQueries({ queryKey: ['teams', data.locationId] })
      queryClient.invalidateQueries({ queryKey: ['location-team', data.locationId] })
      toast.success('Team member added successfully')
    },
    onError: (error: Error) => {
      console.error('Error adding team member:', error)
      toast.error(`Failed to add team member: ${error.message}`)
    },
  })
}

/**
 * Remove a user from a team
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, teamId, locationId }: { userId: string; teamId: string; locationId: string }) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('location_users')
        .update({ team_id: null })
        .eq('user_id', userId)
        .eq('location_id', locationId)

      if (error) throw error
      return { userId, teamId, locationId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.teamId] })
      queryClient.invalidateQueries({ queryKey: ['teams', data.locationId] })
      queryClient.invalidateQueries({ queryKey: ['location-team', data.locationId] })
      toast.success('Team member removed successfully')
    },
    onError: (error: Error) => {
      console.error('Error removing team member:', error)
      toast.error(`Failed to remove team member: ${error.message}`)
    },
  })
}
