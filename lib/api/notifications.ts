import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/types/api'

export type NotificationType = 'company' | 'location' | 'user' | 'system'
export type NotificationPriority = 'low' | 'medium' | 'high'
export type NotificationReferenceType = 
  | 'lead'
  | 'quote'
  | 'invoice'
  | 'calendar_event'
  | 'project'
  | 'customer'
  | 'user'
  | 'location'
  | 'commission'
  | 'material_order'
  | 'work_order'
  | 'door_knock_pin'

export interface Notification {
  id: string
  company_id: string
  user_id?: string
  title: string
  message: string
  type: NotificationType
  priority: NotificationPriority
  location_id?: string
  reference_type?: NotificationReferenceType
  reference_id?: string
  created_by?: string
  created_at: string
  deleted_at?: string
  is_read?: boolean
}

export interface CreateNotificationParams {
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  location_id?: string
  reference_type?: NotificationReferenceType
  reference_id?: string
}

/**
 * Get all notifications for the current user
 */
export async function getUserNotifications(): Promise<ApiResponse<Notification[]>> {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('No authenticated user')

    // Get user's company
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()
    if (userDataError) throw userDataError
    if (!userData?.company_id) throw new Error('User has no company')

    const companyId = userData.company_id

    // Get notifications for user's company, including read status
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        user_notification_reads!inner(user_id)
      `)
      .eq('user_notification_reads.user_id', user.id)
      .eq('company_id', companyId)
      .or(`user_id.eq.${user.id},user_id.is.null`)  // Only notifications for this user or company-wide
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Mark notifications as read/unread based on the join
    const notificationsWithReadStatus = data?.map(notification => ({
      ...notification,
      is_read: true // If it appears in the join, it's been read
    })) || []

    // Also get unread notifications (those not in the read table)
    const { data: unreadData, error: unreadError } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
      .or(`user_id.eq.${user.id},user_id.is.null`)  // Only notifications for this user or company-wide
      .is('deleted_at', null)
      .not('id', 'in', `(${notificationsWithReadStatus.map(n => n.id).join(',')})`)
      .order('created_at', { ascending: false })

    if (unreadError) throw unreadError

    const unreadNotifications = unreadData?.map(notification => ({
      ...notification,
      is_read: false
    })) || []

    // Combine and sort by created_at
    const allNotifications = [...notificationsWithReadStatus, ...unreadNotifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return createSuccessResponse(allNotifications)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId
    })

    if (error) throw error

    return createSuccessResponse(undefined)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Mark a notification as unread
 */
export async function markNotificationUnread(notificationId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    const { error } = await supabase.rpc('mark_notification_unread', {
      p_notification_id: notificationId
    })

    if (error) throw error

    return createSuccessResponse(undefined)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Delete a notification (soft delete)
 */
export async function deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error

    return createSuccessResponse(undefined)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a company-wide notification
 */
export async function createCompanyNotification(
  title: string,
  message: string,
  priority: NotificationPriority = 'medium'
): Promise<ApiResponse<string>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('create_company_notification', {
      p_title: title,
      p_message: message,
      p_priority: priority
    })

    if (error) throw error

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a location-specific notification
 */
export async function createLocationNotification(
  locationId: string,
  title: string,
  message: string,
  priority: NotificationPriority = 'medium'
): Promise<ApiResponse<string>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('create_location_notification', {
      p_location_id: locationId,
      p_title: title,
      p_message: message,
      p_priority: priority
    })

    if (error) throw error

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}