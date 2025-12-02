'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeads, getLead, createLead, updateLead, deleteLead } from '@/lib/api/leads'
import { createStatusChangeActivity } from '@/lib/api/activities'
import { useCurrentCompany } from './use-current-company'
import { LeadFilters, LeadInsert, LeadUpdate } from '@/lib/types'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function useLeads(filters?: LeadFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['leads', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return { data: [], error: null }
      return await getLeads(company.id, filters)
    },
    enabled: !!company?.id,
  })
}

export function useLead(leadId: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['leads', company?.id, leadId],
    queryFn: async () => {
      if (!company?.id) return { data: null, error: null }
      return await getLead(company.id, leadId)
    },
    enabled: !!company?.id && !!leadId,
  })
}

export function useCreateLead() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      if (!company?.id) throw new Error('No company found')
      const result = await createLead(company.id, lead)
      if (result.error) {
        throw new Error(result.error.message || 'Failed to create lead')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id] })
      toast.success('Lead created successfully')
    },
    onError: (error: Error) => {
      console.error('Create lead error:', error)
      toast.error(`Failed to create lead: ${error.message}`)
    },
  })
}

export function useUpdateLead() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: string; updates: LeadUpdate }) => {
      if (!company?.id) throw new Error('No company found')
      return await updateLead(company.id, leadId, updates)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id, variables.leadId] })
      toast.success('Lead updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update lead: ${error.message}`)
    },
  })
}

export function useDeleteLead() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!company?.id) throw new Error('No company found')
      return await deleteLead(company.id, leadId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id] })
      toast.success('Lead deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete lead: ${error.message}`)
    },
  })
}

export function useUpdateLeadStatus() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      if (!company?.id) throw new Error('No company found')
      
      // Get the current lead to capture old status
      const leadResult = await getLead(company.id, leadId)
      const oldStatus = leadResult.data?.status
      
      // Update the lead status
      const result = await updateLead(company.id, leadId, { status: status as any })
      if (result.error) {
        throw new Error(result.error.message || 'Failed to update status')
      }
      
      // Get current user
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Create activity log entry for status change
      if (oldStatus && oldStatus !== status) {
        await createStatusChangeActivity(
          company.id,
          'lead',
          leadId,
          oldStatus,
          status,
          user?.id
        )
      }
      
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['activities', 'lead', variables.leadId] })
      toast.success('Status updated successfully')
    },
    onError: (error: Error) => {
      console.error('Status update error:', error)
      toast.error(`Failed to update status: ${error.message}`)
    },
  })
}
