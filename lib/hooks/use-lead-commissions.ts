'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLeadCommissions,
  getUserCommissions,
  getCommissionsByStatus,
  getLeadCommissionSummary,
  createLeadCommission,
  updateLeadCommission,
  deleteLeadCommission,
  markCommissionPaid,
} from '@/lib/api/lead-commissions'
import { useCurrentCompany } from './use-current-company'
import { useCurrentUser } from './use-current-user'
import { LeadCommissionInsert, LeadCommissionUpdate, LeadCommissionFilters } from '@/lib/types/commissions'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

/**
 * Fetch all commissions for a specific lead
 */
export function useLeadCommissions(leadId: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['lead-commissions', company?.id, leadId],
    queryFn: async () => {
      if (!company?.id || !leadId) return { data: [], error: null }
      return await getLeadCommissions(leadId, company.id)
    },
    enabled: !!company?.id && !!leadId,
  })
}

/**
 * Fetch commission summary for a lead
 */
export function useLeadCommissionSummary(leadId: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['lead-commission-summary', company?.id, leadId],
    queryFn: async () => {
      if (!company?.id || !leadId) {
        return { 
          data: {
            total_owed: 0,
            total_paid: 0,
            total_pending: 0,
            total_approved: 0,
            total_cancelled: 0,
            count_paid: 0,
            count_pending: 0,
            count_approved: 0,
          }, 
          error: null 
        }
      }
      return await getLeadCommissionSummary(leadId, company.id)
    },
    enabled: !!company?.id && !!leadId,
  })
}

/**
 * Fetch all commissions for a specific user
 */
export function useUserCommissions(userId: string, filters?: LeadCommissionFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['user-commissions', company?.id, userId, filters],
    queryFn: async () => {
      if (!company?.id || !userId) return { data: [], error: null }
      return await getUserCommissions(userId, company.id, filters)
    },
    enabled: !!company?.id && !!userId,
  })
}

/**
 * Fetch commissions by status
 */
export function useCommissionsByStatus(status: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['commissions-by-status', company?.id, status],
    queryFn: async () => {
      if (!company?.id) return { data: [], error: null }
      return await getCommissionsByStatus(company.id, status)
    },
    enabled: !!company?.id && !!status,
  })
}

/**
 * Create a new commission
 */
export function useCreateLeadCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: LeadCommissionInsert }) => {
      if (!company?.id) throw new Error('No company found')
      const result = await createLeadCommission(leadId, company.id, data)
      if (result.error) {
        throw new Error(result.error.message || 'Failed to create commission')
      }
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-commissions', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-commission-summary', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['user-commissions', company?.id] })
      toast.success('Commission created successfully')
    },
    onError: (error: Error) => {
      console.error('Create commission error:', error)
      toast.error(`Failed to create commission: ${error.message}`)
    },
  })
}

/**
 * Update an existing commission
 */
export function useUpdateLeadCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      leadId,
      updates 
    }: { 
      id: string
      leadId: string
      updates: LeadCommissionUpdate 
    }) => {
      if (!company?.id) throw new Error('No company found')
      const result = await updateLeadCommission(id, company.id, updates)
      if (result.error) {
        throw new Error(result.error.message || 'Failed to update commission')
      }
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-commissions', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-commission-summary', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['user-commissions', company?.id] })
      toast.success('Commission updated successfully')
    },
    onError: (error: Error) => {
      console.error('Update commission error:', error)
      toast.error(`Failed to update commission: ${error.message}`)
    },
  })
}

/**
 * Delete a commission
 */
export function useDeleteLeadCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      if (!company?.id) throw new Error('No company found')
      const result = await deleteLeadCommission(id, company.id)
      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete commission')
      }
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-commissions', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-commission-summary', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['user-commissions', company?.id] })
      toast.success('Commission deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Delete commission error:', error)
      toast.error(`Failed to delete commission: ${error.message}`)
    },
  })
}

/**
 * Mark a commission as paid
 */
export function useMarkCommissionPaid() {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      leadId,
      paymentAmount,
      paymentNotes 
    }: { 
      id: string
      leadId: string
      paymentAmount?: number
      paymentNotes?: string 
    }) => {
      // Get company/user with fallback to avoid blocking
      let companyId = company?.id
      let userId = currentUser?.data?.id
      
      if (!companyId || !userId) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()
          companyId = userData?.company_id
          userId = user.id
        }
      }
      
      if (!companyId || !userId) {
        throw new Error('Unable to determine company or user')
      }
      
      const result = await markCommissionPaid(id, companyId, userId, paymentAmount, paymentNotes)
      if (result.error) {
        throw new Error(result.error.message || 'Failed to mark commission as paid')
      }
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-commissions', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-commission-summary', company?.id, variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['user-commissions', company?.id] })
      toast.success('Commission marked as paid')
    },
    onError: (error: Error) => {
      console.error('Mark commission paid error:', error)
      toast.error(`Failed to mark commission as paid: ${error.message}`)
    },
  })
}
