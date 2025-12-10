// Permissions Management React Query Hooks
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getUserPermissions,
  updateUserPermissions,
  copyPermissions,
  grantAllPermissions,
  revokeAllPermissions,
  checkPermission,
  checkPermissions,
  bulkUpdatePermissions,
} from '@/lib/api/permissions'
import { UserPermissionsUpdate, PermissionKey } from '@/lib/types/users'

// =====================================================
// QUERIES
// =====================================================

/**
 * Get permissions for a specific user
 */
export function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => getUserPermissions(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Check if user has a specific permission
 */
export function useCheckPermission(userId: string | undefined, permission: PermissionKey) {
  return useQuery({
    queryKey: ['check-permission', userId, permission],
    queryFn: () => checkPermission(userId!, permission),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Check multiple permissions at once
 */
export function useCheckPermissions(userId: string | undefined, permissions: PermissionKey[]) {
  return useQuery({
    queryKey: ['check-permissions', userId, permissions],
    queryFn: () => checkPermissions(userId!, permissions),
    enabled: !!userId && permissions.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Update user permissions
 */
export function useUpdatePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: UserPermissionsUpdate }) =>
      updateUserPermissions(userId, permissions),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
      toast.success('Permissions updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permissions: ${error.message}`)
    },
  })
}

/**
 * Copy permissions from one user to another
 */
export function useCopyPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fromUserId, toUserId }: { fromUserId: string; toUserId: string }) =>
      copyPermissions(fromUserId, toUserId),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.toUserId] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.toUserId] })
      toast.success('Permissions copied successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to copy permissions: ${error.message}`)
    },
  })
}

/**
 * Grant all permissions to a user (make admin)
 */
export function useGrantAllPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => grantAllPermissions(userId),
    onSuccess: (result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      toast.success('All permissions granted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant permissions: ${error.message}`)
    },
  })
}

/**
 * Revoke all permissions from a user
 */
export function useRevokeAllPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => revokeAllPermissions(userId),
    onSuccess: (result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      toast.success('All permissions revoked')
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke permissions: ${error.message}`)
    },
  })
}

/**
 * Bulk update multiple permissions at once
 */
export function useBulkUpdatePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: Partial<Record<PermissionKey, boolean>> }) =>
      bulkUpdatePermissions(userId, permissions),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
      toast.success('Permissions updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permissions: ${error.message}`)
    },
  })
}
