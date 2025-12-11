// User Management React Query Hooks
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getUsers,
  getUserById,
  getCurrentUser,
  createUser,
  inviteUser,
  updateUser,
  deleteUser,
  deactivateUser,
  reactivateUser,
  uploadAvatar,
  deleteAvatar,
  getForemen,
  getCrewMembers,
} from '@/lib/api/users'
import { UserFilters, UserFormData, InviteUserData, UserUpdate } from '@/lib/types/users'
import { useCurrentCompany } from './use-current-company'

// =====================================================
// QUERIES
// =====================================================

/**
 * Get all users for the current company
 */
export function useUsers(filters?: UserFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['users', company?.id, filters],
    queryFn: () => getUsers(company!.id, filters),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Get a single user by ID
 */
export function useUser(userId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId!, company!.id),
    enabled: !!userId && !!company?.id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get the currently logged in user with all relations
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get all foremen for crew assignment
 */
export function useForemen() {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['foremen', company?.id],
    queryFn: () => getForemen(company!.id),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get crew members under a specific foreman
 */
export function useCrewMembers(foremanId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['crew-members', company?.id, foremanId],
    queryFn: () => getCrewMembers(company!.id, foremanId!),
    enabled: !!company?.id && !!foremanId,
    staleTime: 1000 * 60 * 5,
  })
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Create a new user
 */
export function useCreateUser() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userData: UserFormData) => createUser(company!.id, userData),
    onSuccess: () => {
      // Invalidate all users queries for this company
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`)
    },
  })
}

/**
 * Invite a new user (sends email invite)
 */
export function useInviteUser() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (inviteData: InviteUserData) => inviteUser(company!.id, inviteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', company?.id] })
      toast.success('User invited successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to invite user: ${error.message}`)
    },
  })
}

/**
 * Update a user's information
 */
export function useUpdateUser() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: UserUpdate }) =>
      updateUser(userId, company!.id, updates),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      toast.success('User updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`)
    },
  })
}

/**
 * Delete a user (soft delete)
 */
export function useDeleteUser() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId, company!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', company?.id] })
      toast.success('User deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`)
    },
  })
}

/**
 * Deactivate a user
 */
export function useDeactivateUser() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deactivateUser(userId, company!.id),
    onSuccess: (result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      toast.success('User deactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate user: ${error.message}`)
    },
  })
}

/**
 * Reactivate a user
 */
export function useReactivateUser() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => reactivateUser(userId, company!.id),
    onSuccess: (result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['users', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      toast.success('User reactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate user: ${error.message}`)
    },
  })
}

/**
 * Upload user avatar
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) => uploadAvatar(userId, file),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      toast.success('Avatar uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload avatar: ${error.message}`)
    },
  })
}

/**
 * Delete user avatar
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deleteAvatar(userId),
    onSuccess: (result, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      toast.success('Avatar deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete avatar: ${error.message}`)
    },
  })
}
