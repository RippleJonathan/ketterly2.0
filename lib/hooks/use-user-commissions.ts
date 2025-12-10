// User Commissions React Query Hooks
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getUserCommissions,
  getCommissionById,
  createCommission,
  updateCommission,
  approveCommission,
  markCommissionPaid,
  holdCommission,
  voidCommission,
  getCommissionSummary,
  getCommissionsForLead,
  bulkApproveCommissions,
  bulkMarkPaid,
} from '@/lib/api/user-commissions'
import {
  UserCommissionInsert,
  UserCommissionUpdate,
  CommissionStatus,
} from '@/lib/types/users'
import { useCurrentCompany } from './use-current-company'

// =====================================================
// QUERIES
// =====================================================

/**
 * Get all commissions for the company (optionally filtered by user and status)
 */
export function useCommissions(userId?: string, status?: CommissionStatus) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['commissions', company?.id, userId, status],
    queryFn: () => getUserCommissions(company!.id, userId, status),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Get a single commission by ID
 */
export function useCommission(commissionId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['commission', commissionId],
    queryFn: () => getCommissionById(commissionId!, company!.id),
    enabled: !!commissionId && !!company?.id,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Get commission summary for a user
 */
export function useCommissionSummary(userId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['commission-summary', company?.id, userId],
    queryFn: () => getCommissionSummary(company!.id, userId!),
    enabled: !!company?.id && !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Get all commissions for a specific lead/job
 */
export function useCommissionsForLead(leadId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['commissions-for-lead', leadId],
    queryFn: () => getCommissionsForLead(leadId!, company!.id),
    enabled: !!leadId && !!company?.id,
    staleTime: 1000 * 60 * 2,
  })
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a new commission
 */
export function useCreateCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commissionData: UserCommissionInsert) => createCommission(commissionData),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id, variables.user_id] })
      queryClient.invalidateQueries({ queryKey: ['commissions-for-lead', variables.lead_id] })
      toast.success('Commission created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create commission: ${error.message}`)
    },
  })
}

/**
 * Update a commission
 */
export function useUpdateCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commissionId, updates }: { commissionId: string; updates: UserCommissionUpdate }) =>
      updateCommission(commissionId, company!.id, updates),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission', variables.commissionId] })
      if (result.data?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id, result.data.user_id] })
      }
      toast.success('Commission updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update commission: ${error.message}`)
    },
  })
}

/**
 * Approve a commission
 */
export function useApproveCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commissionId: string) => approveCommission(commissionId, company!.id),
    onSuccess: (result, commissionId) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission', commissionId] })
      if (result.data?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id, result.data.user_id] })
      }
      toast.success('Commission approved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve commission: ${error.message}`)
    },
  })
}

/**
 * Mark a commission as paid
 */
export function useMarkCommissionPaid() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commissionId,
      paidAmount,
      paidDate,
    }: {
      commissionId: string
      paidAmount: number
      paidDate?: string
    }) => markCommissionPaid(commissionId, company!.id, paidAmount, paidDate),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission', variables.commissionId] })
      if (result.data?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id, result.data.user_id] })
      }
      toast.success('Commission marked as paid')
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark commission as paid: ${error.message}`)
    },
  })
}

/**
 * Hold a commission
 */
export function useHoldCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commissionId, notes }: { commissionId: string; notes?: string }) =>
      holdCommission(commissionId, company!.id, notes),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission', variables.commissionId] })
      if (result.data?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id, result.data.user_id] })
      }
      toast.success('Commission placed on hold')
    },
    onError: (error: Error) => {
      toast.error(`Failed to hold commission: ${error.message}`)
    },
  })
}

/**
 * Void a commission
 */
export function useVoidCommission() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commissionId, notes }: { commissionId: string; notes?: string }) =>
      voidCommission(commissionId, company!.id, notes),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission', variables.commissionId] })
      if (result.data?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id, result.data.user_id] })
      }
      toast.success('Commission voided')
    },
    onError: (error: Error) => {
      toast.error(`Failed to void commission: ${error.message}`)
    },
  })
}

/**
 * Bulk approve multiple commissions
 */
export function useBulkApproveCommissions() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commissionIds: string[]) => bulkApproveCommissions(commissionIds, company!.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      toast.success(`${result.data} commission(s) approved`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve commissions: ${error.message}`)
    },
  })
}

/**
 * Bulk mark multiple commissions as paid
 */
export function useBulkMarkPaid() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commissionIds, paidDate }: { commissionIds: string[]; paidDate?: string }) =>
      bulkMarkPaid(commissionIds, company!.id, paidDate),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      toast.success(`${result.data} commission(s) marked as paid`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark commissions as paid: ${error.message}`)
    },
  })
}
