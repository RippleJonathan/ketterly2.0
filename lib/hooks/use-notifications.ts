import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserNotifications,
  markNotificationRead,
  markNotificationUnread,
  deleteNotification,
  createCompanyNotification,
  createLocationNotification,
  type Notification,
  type NotificationPriority
} from '@/lib/api/notifications'
import { toast } from 'sonner'

/**
 * Get all notifications for the current user
 */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getUserNotifications,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark notification as read: ${error.message}`)
    },
  })
}

/**
 * Mark notification as unread
 */
export function useMarkNotificationUnread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationUnread(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark notification as unread: ${error.message}`)
    },
  })
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notification deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete notification: ${error.message}`)
    },
  })
}

/**
 * Create company-wide notification
 */
export function useCreateCompanyNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      title,
      message,
      priority
    }: {
      title: string
      message: string
      priority?: NotificationPriority
    }) => createCompanyNotification(title, message, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Company notification sent successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send notification: ${error.message}`)
    },
  })
}

/**
 * Create location-specific notification
 */
export function useCreateLocationNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      locationId,
      title,
      message,
      priority
    }: {
      locationId: string
      title: string
      message: string
      priority?: NotificationPriority
    }) => createLocationNotification(locationId, title, message, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Location notification sent successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send notification: ${error.message}`)
    },
  })
}