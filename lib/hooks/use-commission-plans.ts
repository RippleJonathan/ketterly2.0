// Commission Plans React Query Hooks
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCommissionPlans,
  getCommissionPlanById,
  createCommissionPlan,
  updateCommissionPlan,
  deleteCommissionPlan,
  deactivateCommissionPlan,
  reactivateCommissionPlan,
  getUsersUsingPlan,
} from '@/lib/api/commission-plans'
import { CommissionPlanInsert, CommissionPlanUpdate } from '@/lib/types/users'
import { useCurrentCompany } from './use-current-company'
import { useCurrentUser } from './use-users'

// =====================================================
// QUERIES
// =====================================================

/**
 * Get all commission plans for the current company
 */
export function useCommissionPlans(includeInactive = false) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['commission-plans', company?.id, includeInactive],
    queryFn: () => getCommissionPlans(company!.id, includeInactive),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get a single commission plan by ID
 */
export function useCommissionPlan(planId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['commission-plan', planId],
    queryFn: () => getCommissionPlanById(planId!, company!.id),
    enabled: !!planId && !!company?.id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get users using a specific commission plan
 */
export function useUsersUsingPlan(planId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['users-using-plan', planId],
    queryFn: () => getUsersUsingPlan(planId!, company!.id),
    enabled: !!planId && !!company?.id,
    staleTime: 1000 * 60 * 5,
  })
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a new commission plan
 */
export function useCreateCommissionPlan() {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (plan: CommissionPlanInsert) => 
      createCommissionPlan(company!.id, plan, currentUser?.data?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans', company?.id] })
      toast.success('Commission plan created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create commission plan: ${error.message}`)
    },
  })
}

/**
 * Update a commission plan
 */
export function useUpdateCommissionPlan() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ planId, updates }: { planId: string; updates: CommissionPlanUpdate }) =>
      updateCommissionPlan(planId, company!.id, updates),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission-plan', variables.planId] })
      toast.success('Commission plan updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update commission plan: ${error.message}`)
    },
  })
}

/**
 * Delete a commission plan (soft delete)
 */
export function useDeleteCommissionPlan() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (planId: string) => deleteCommissionPlan(planId, company!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans', company?.id] })
      toast.success('Commission plan deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete commission plan: ${error.message}`)
    },
  })
}

/**
 * Deactivate a commission plan
 */
export function useDeactivateCommissionPlan() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (planId: string) => deactivateCommissionPlan(planId, company!.id),
    onSuccess: (result, planId) => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission-plan', planId] })
      toast.success('Commission plan deactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate commission plan: ${error.message}`)
    },
  })
}

/**
 * Reactivate a commission plan
 */
export function useReactivateCommissionPlan() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (planId: string) => reactivateCommissionPlan(planId, company!.id),
    onSuccess: (result, planId) => {
      queryClient.invalidateQueries({ queryKey: ['commission-plans', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission-plan', planId] })
      toast.success('Commission plan reactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate commission plan: ${error.message}`)
    },
  })
}
