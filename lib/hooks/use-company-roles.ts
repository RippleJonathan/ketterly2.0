// React Query hooks for Company Roles
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCompanyRoles,
  getCompanyRoleById,
  createCompanyRole,
  updateCompanyRole,
  deleteCompanyRole,
  getCompanyRolesWithUserCounts,
  createDefaultRoles,
  duplicateCompanyRole
} from '@/lib/api/company-roles'
import type { 
  CompanyRoleInsert, 
  CompanyRoleUpdate,
  CompanyRoleFilters 
} from '@/lib/types/users'
import { useCurrentCompany } from './use-current-company'

/**
 * Hook to fetch all company roles
 */
export function useCompanyRoles(filters?: CompanyRoleFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['company-roles', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) throw new Error('No company ID')
      const response = await getCompanyRoles(company.id, filters)
      if (response.error) throw response.error
      return response.data || []
    },
    enabled: !!company?.id,
  })
}

/**
 * Hook to fetch company roles with user counts
 */
export function useCompanyRolesWithCounts() {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['company-roles-with-counts', company?.id],
    queryFn: async () => {
      if (!company?.id) throw new Error('No company ID')
      const response = await getCompanyRolesWithUserCounts(company.id)
      if (response.error) throw response.error
      return response.data || []
    },
    enabled: !!company?.id,
  })
}

/**
 * Hook to fetch a single company role by ID
 */
export function useCompanyRole(roleId: string | null) {
  return useQuery({
    queryKey: ['company-role', roleId],
    queryFn: async () => {
      if (!roleId) throw new Error('No role ID')
      const response = await getCompanyRoleById(roleId)
      if (response.error) throw response.error
      return response.data
    },
    enabled: !!roleId,
  })
}

/**
 * Hook to create a new company role
 */
export function useCreateCompanyRole() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: async (role: CompanyRoleInsert) => {
      const response = await createCompanyRole(role)
      if (response.error) throw response.error
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-roles', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-roles-with-counts', company?.id] })
      toast.success('Role created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`)
    },
  })
}

/**
 * Hook to update an existing company role
 */
export function useUpdateCompanyRole() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: async ({ roleId, updates }: { roleId: string; updates: CompanyRoleUpdate }) => {
      const response = await updateCompanyRole(roleId, updates)
      if (response.error) throw response.error
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-roles', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-roles-with-counts', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-role', variables.roleId] })
      toast.success('Role updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`)
    },
  })
}

/**
 * Hook to delete a company role
 */
export function useDeleteCompanyRole() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await deleteCompanyRole(roleId)
      if (response.error) throw response.error
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-roles', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-roles-with-counts', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['users', company?.id] })
      toast.success('Role deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role: ${error.message}`)
    },
  })
}

/**
 * Hook to create default roles for a new company
 */
export function useCreateDefaultRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ companyId, createdBy }: { companyId: string; createdBy: string }) => {
      const response = await createDefaultRoles(companyId, createdBy)
      if (response.error) throw response.error
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-roles', variables.companyId] })
      queryClient.invalidateQueries({ queryKey: ['company-roles-with-counts', variables.companyId] })
      toast.success('Default roles created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create default roles: ${error.message}`)
    },
  })
}

/**
 * Hook to duplicate an existing role
 */
export function useDuplicateCompanyRole() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: async ({
      sourceRoleId,
      newRoleName,
      newDisplayName
    }: {
      sourceRoleId: string
      newRoleName: string
      newDisplayName: string
    }) => {
      const response = await duplicateCompanyRole(sourceRoleId, newRoleName, newDisplayName)
      if (response.error) throw response.error
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-roles', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-roles-with-counts', company?.id] })
      toast.success('Role duplicated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate role: ${error.message}`)
    },
  })
}

/**
 * Helper hook to get only custom (non-system) roles
 */
export function useCustomRoles() {
  return useCompanyRoles({ is_system_role: false })
}

/**
 * Helper hook to get only system roles
 */
export function useSystemRoles() {
  return useCompanyRoles({ is_system_role: true })
}

/**
 * Helper hook to get only active roles
 */
export function useActiveRoles() {
  return useCompanyRoles({ is_active: true })
}
