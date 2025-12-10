// Role Templates React Query Hooks
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getRoleTemplates,
  getRoleTemplateById,
  createRoleTemplate,
  updateRoleTemplate,
  deleteRoleTemplate,
  deactivateRoleTemplate,
  reactivateRoleTemplate,
  applyRoleTemplate,
  applyRoleTemplateToMultiple,
  createTemplateFromUser,
  duplicateRoleTemplate,
} from '@/lib/api/role-templates'
import { RoleTemplateInsert, RoleTemplateUpdate } from '@/lib/types/users'
import { useCurrentCompany } from './use-current-company'
import { useCurrentUser } from './use-users'

// =====================================================
// QUERIES
// =====================================================

/**
 * Get all role templates for the current company
 */
export function useRoleTemplates(includeInactive = false) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['role-templates', company?.id, includeInactive],
    queryFn: () => getRoleTemplates(company!.id, includeInactive),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get a single role template by ID
 */
export function useRoleTemplate(templateId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['role-template', templateId],
    queryFn: () => getRoleTemplateById(templateId!, company!.id),
    enabled: !!templateId && !!company?.id,
    staleTime: 1000 * 60 * 5,
  })
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a new role template
 */
export function useCreateRoleTemplate() {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (template: RoleTemplateInsert) =>
      createRoleTemplate(company!.id, template, currentUser?.data?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates', company?.id] })
      toast.success('Role template created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role template: ${error.message}`)
    },
  })
}

/**
 * Update a role template
 */
export function useUpdateRoleTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, updates }: { templateId: string; updates: RoleTemplateUpdate }) =>
      updateRoleTemplate(templateId, company!.id, updates),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-templates', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['role-template', variables.templateId] })
      toast.success('Role template updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role template: ${error.message}`)
    },
  })
}

/**
 * Delete a role template (soft delete)
 */
export function useDeleteRoleTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteRoleTemplate(templateId, company!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates', company?.id] })
      toast.success('Role template deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role template: ${error.message}`)
    },
  })
}

/**
 * Deactivate a role template
 */
export function useDeactivateRoleTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deactivateRoleTemplate(templateId, company!.id),
    onSuccess: (result, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['role-templates', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['role-template', templateId] })
      toast.success('Role template deactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate role template: ${error.message}`)
    },
  })
}

/**
 * Reactivate a role template
 */
export function useReactivateRoleTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => reactivateRoleTemplate(templateId, company!.id),
    onSuccess: (result, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['role-templates', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['role-template', templateId] })
      toast.success('Role template reactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate role template: ${error.message}`)
    },
  })
}

/**
 * Apply a role template to a user
 */
export function useApplyRoleTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, templateId }: { userId: string; templateId: string }) =>
      applyRoleTemplate(userId, templateId),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
      toast.success('Role template applied successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply role template: ${error.message}`)
    },
  })
}

/**
 * Apply a role template to multiple users
 */
export function useApplyRoleTemplateToMultiple() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userIds, templateId }: { userIds: string[]; templateId: string }) =>
      applyRoleTemplateToMultiple(userIds, templateId),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', company?.id] })
      variables.userIds.forEach(userId => {
        queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
        queryClient.invalidateQueries({ queryKey: ['user', userId] })
      })
      toast.success(`Role template applied to ${result.data} user(s)`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply role template: ${error.message}`)
    },
  })
}

/**
 * Create a role template from a user's current permissions
 */
export function useCreateTemplateFromUser() {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      templateName,
      templateDescription,
    }: {
      userId: string
      templateName: string
      templateDescription: string | null
    }) =>
      createTemplateFromUser(
        company!.id,
        userId,
        templateName,
        templateDescription,
        currentUser?.data?.id
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates', company?.id] })
      toast.success('Role template created from user permissions')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

/**
 * Duplicate an existing role template
 */
export function useDuplicateRoleTemplate() {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, newName }: { templateId: string; newName: string }) =>
      duplicateRoleTemplate(templateId, company!.id, newName, currentUser?.data?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates', company?.id] })
      toast.success('Role template duplicated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate template: ${error.message}`)
    },
  })
}
