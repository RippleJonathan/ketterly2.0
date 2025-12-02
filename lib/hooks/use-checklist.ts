'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeadChecklistItems, toggleChecklistItem } from '@/lib/api/checklist'
import { createActivity } from '@/lib/api/activities'
import { getLead, updateLead } from '@/lib/api/leads'
import { useCurrentCompany } from './use-current-company'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PIPELINE_STAGE_ORDER } from '@/lib/constants/pipeline'

export function useLeadChecklist(leadId: string | undefined) {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: ['checklist', leadId],
    queryFn: async () => {
      if (!company?.id || !leadId) return null
      const response = await getLeadChecklistItems(company.id, leadId)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    enabled: !!company?.id && !!leadId,
  })
}

export function useToggleChecklistItem() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      isCompleted,
      leadId,
      itemLabel,
      stage
    }: { 
      itemId: string
      isCompleted: boolean
      leadId: string
      itemLabel: string
      stage: string
    }) => {
      if (!company?.id) throw new Error('No company found')
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Toggle the checklist item
      const response = await toggleChecklistItem(
        company.id,
        itemId,
        isCompleted,
        user.id
      )
      
      if (response.error) throw new Error(response.error.message)

      // Create activity log entry
      await createActivity(company.id, {
        entity_type: 'lead',
        entity_id: leadId,
        activity_type: 'other',
        title: isCompleted 
          ? `Completed: ${itemLabel}`
          : `Unchecked: ${itemLabel}`,
        description: isCompleted
          ? `Marked "${itemLabel}" as complete in ${stage} stage`
          : `Unmarked "${itemLabel}" in ${stage} stage`,
        created_by: user.id,
      })

      // Check if all items in this stage are now complete
      const allItemsResponse = await getLeadChecklistItems(company.id, leadId)
      if (allItemsResponse.data) {
        const stageItems = allItemsResponse.data.filter(item => item.stage === stage)
        const allComplete = stageItems.every(item => item.is_completed)

        if (allComplete && isCompleted) {
          // Get current lead status
          const leadResponse = await getLead(company.id, leadId)
          const currentStage = leadResponse.data?.status

          // Find next stage in pipeline
          const currentIndex = PIPELINE_STAGE_ORDER.indexOf(currentStage as any)
          const nextStage = PIPELINE_STAGE_ORDER[currentIndex + 1]

          // Auto-advance to next stage if there is one
          if (nextStage && currentStage === stage) {
            await updateLead(company.id, leadId, { status: nextStage as any })
            
            // Log the auto-advancement
            await createActivity(company.id, {
              entity_type: 'lead',
              entity_id: leadId,
              activity_type: 'status_change',
              title: 'Stage Auto-Advanced',
              description: `All items in ${stage} stage completed. Advanced to ${nextStage} stage.`,
              created_by: user.id,
            })

            toast.success(`All ${stage} tasks complete! Advanced to ${nextStage} stage.`)
          }
        }
      }
      
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['activities', variables.leadId] })
      
      if (!PIPELINE_STAGE_ORDER[PIPELINE_STAGE_ORDER.indexOf(variables.stage as any) + 1]) {
        // Only show the simple success message if we're not auto-advancing
        toast.success(variables.isCompleted ? 'Item marked complete' : 'Item marked incomplete')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update checklist: ${error.message}`)
    },
  })
}
