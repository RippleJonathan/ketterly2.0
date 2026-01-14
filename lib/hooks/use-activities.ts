'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivities, createActivity, deleteActivity, type Activity, type ActivityInsert } from '@/lib/api/activities'
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
      const result = await createActivity(company.id, activity)
      if (result.error) {
        throw new Error(result.error.message || 'Failed to create activity')
      }
      return result
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] })
      toast.success('Activity logged successfully')

      // Send push notification for new notes on leads
      if (entityType === 'lead' && variables.activity_type === 'note' && result.data) {
        try {
          // Get lead details and assigned user
          const { getLeads } = await import('@/lib/api/leads')
          const leadResult = await getLeads(company!.id, { lead_id: entityId })
          
          if (leadResult.data && leadResult.data.length > 0) {
            const lead = leadResult.data[0]
            
            // Notify assigned user (if different from author)
            if (lead.sales_rep_id && lead.sales_rep_id !== variables.created_by) {
              const { notifyNewNote } = await import('@/lib/email/user-notifications')
              
              // Get author name
              const { createClient } = await import('@/lib/supabase/client')
              const supabase = createClient()
              const { data: author } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', variables.created_by)
                .single()

              await notifyNewNote({
                userId: lead.sales_rep_id,
                companyId: company!.id,
                leadId: entityId,
                leadName: lead.full_name,
                noteAuthor: author?.full_name || 'Unknown',
                noteAuthorId: variables.created_by || '',
                noteContent: variables.description || variables.title || '',
              })
            }
          }
        } catch (notificationError) {
          console.error('Failed to send note notification:', notificationError)
          // Don't fail activity creation if notification fails
        }
      }
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
