'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivities, deleteActivity, type Activity, type ActivityInsert } from '@/lib/api/activities'
import { createActivityWithNotifications } from '@/app/actions/activities'
import { useCurrentCompany } from './use-current-company'
import { toast } from 'sonner'

export function useActivities(
  entityType: Activity['entity_type'],
  entityId: string
) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['activities', entityType, entityId],
    queryFn: async () => {
      if (!company?.id) return { data: [], error: null }
      return await getActivities(company.id, entityType, entityId)
    },
    enabled: !!company?.id && !!entityId,
  })
}

export function useCreateActivity(
  entityType: Activity['entity_type'],
  entityId: string
) {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (activity: ActivityInsert) => {
      if (!company?.id) throw new Error('No company found')
      const result = await createActivityWithNotifications(company.id, activity)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create activity')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] })
      toast.success('Activity logged successfully')
    },
    onError: (error: Error) => {
      console.error('Create activity error:', error)
      toast.error(`Failed to log activity: ${error.message}`)
    },
  })
}

export function useDeleteActivity(
  entityType: Activity['entity_type'],
  entityId: string
) {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!company?.id) throw new Error('No company found')
      const result = await deleteActivity(company.id, activityId)
      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete activity')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] })
      toast.success('Activity deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Delete activity error:', error)
      toast.error(`Failed to delete activity: ${error.message}`)
    },
  })
}
