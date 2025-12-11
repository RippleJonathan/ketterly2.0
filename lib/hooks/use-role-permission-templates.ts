/**
 * React Query Hooks for Role Permission Templates
 * 
 * This module provides TanStack Query hooks for managing role permission templates.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentCompany } from './use-current-company'
import {
  getRolePermissionTemplates,
  getRolePermissionTemplate,
  updateRolePermissionTemplate,
  resetRolePermissionTemplate,
  RolePermissionTemplate,
  RolePermissions
} from '@/lib/api/role-permission-templates'
import { UserRole } from '@/lib/types/users'
import { toast } from 'sonner'

// =====================================================
// QUERY KEYS
// =====================================================

export const rolePermissionTemplateKeys = {
  all: ['role-permission-templates'] as const,
  lists: () => [...rolePermissionTemplateKeys.all, 'list'] as const,
  list: (companyId: string) => [...rolePermissionTemplateKeys.lists(), companyId] as const,
  details: () => [...rolePermissionTemplateKeys.all, 'detail'] as const,
  detail: (companyId: string, role: UserRole) => [...rolePermissionTemplateKeys.details(), companyId, role] as const,
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch all role permission templates for current company
 */
export function useRolePermissionTemplates() {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: rolePermissionTemplateKeys.list(company?.id || ''),
    queryFn: async () => {
      const { data, error } = await getRolePermissionTemplates(company!.id)
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })
}

/**
 * Fetch a single role permission template
 */
export function useRolePermissionTemplate(role: UserRole) {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: rolePermissionTemplateKeys.detail(company?.id || '', role),
    queryFn: async () => {
      const { data, error } = await getRolePermissionTemplate(company!.id, role)
      if (error) throw error
      return data
    },
    enabled: !!company?.id && !!role,
  })
}

/**
 * Update role permission template mutation
 */
export function useUpdateRolePermissionTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      role,
      permissions
    }: {
      role: UserRole
      permissions: Partial<RolePermissions>
    }) => {
      const { data, error } = await updateRolePermissionTemplate(
        company!.id,
        role,
        permissions
      )
      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: rolePermissionTemplateKeys.list(company!.id)
      })
      queryClient.invalidateQueries({
        queryKey: rolePermissionTemplateKeys.detail(company!.id, variables.role)
      })
      
      toast.success('Role permissions updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role permissions: ${error.message}`)
    },
  })
}

/**
 * Reset role permission template to defaults
 */
export function useResetRolePermissionTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (role: UserRole) => {
      const { data, error } = await resetRolePermissionTemplate(company!.id, role)
      if (error) throw error
      return data
    },
    onSuccess: (data, role) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: rolePermissionTemplateKeys.list(company!.id)
      })
      queryClient.invalidateQueries({
        queryKey: rolePermissionTemplateKeys.detail(company!.id, role)
      })
      
      toast.success('Role permissions reset to defaults')
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset role permissions: ${error.message}`)
    },
  })
}
