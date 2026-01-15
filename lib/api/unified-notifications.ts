/**
 * Unified Notification System
 * 
 * This module provides a centralized way to create notifications that:
 * 1. Creates an in-app notification (notifications table)
 * 2. Automatically sends push notification (OneSignal) based on user preferences
 * 3. Checks user notification preferences before sending
 */

import { createClient } from '@/lib/supabase/server'
import { shouldSendPushNotification } from '@/lib/email/user-notifications'
import { sendPushNotification } from '@/lib/api/onesignal'

export type UnifiedNotificationType = 'company' | 'location' | 'user' | 'system'
export type UnifiedNotificationPriority = 'low' | 'medium' | 'high'

export interface UnifiedNotificationParams {
  // Who receives this notification
  userIds: string[] // Array of user IDs to notify
  
  // Notification content
  title: string
  message: string
  
  // Notification metadata
  type: UnifiedNotificationType
  priority?: UnifiedNotificationPriority
  locationId?: string
  
  // Push notification extras
  pushUrl?: string // URL to open when notification is clicked
  pushData?: Record<string, any> // Additional data for push notification
  icon?: string // Icon URL for push notification
  image?: string // Image URL for push notification
  
  // Preference key (what type of notification this is for checking user preferences)
  preferenceKey?: 'new_leads' | 'lead_assigned' | 'lead_status_change' | 'appointment_scheduled' | 
                  'quote_sent' | 'quote_accepted' | 'project_milestone' | 'invoice_due' | 
                  'payment_received' | 'crew_assignment' | 'material_delivery'
}

/**
 * Create a unified notification (in-app + push)
 * 
 * This function:
 * 1. Creates in-app notification records for all specified users
 * 2. Checks each user's notification preferences
 * 3. Sends push notifications to users who have it enabled
 */
export async function createUnifiedNotification(params: UnifiedNotificationParams): Promise<{
  success: boolean
  inAppNotificationIds: string[]
  pushNotificationsSent: number
  errors?: string[]
}> {
  const supabase = await createClient()
  const errors: string[] = []
  const inAppNotificationIds: string[] = []
  let pushNotificationsSent = 0

  try {
    // Get current user (creator)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get company ID and company name
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, companies(name)')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    const companyId = userData.company_id
    const companyName = (userData.companies as any)?.name || 'Ketterly'

    // Step 1: Create in-app notifications for all users
    const notificationInserts = params.userIds.map(userId => ({
      company_id: companyId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority || 'medium',
      location_id: params.locationId || null,
      created_by: user.id,
    }))

    const { data: createdNotifications, error: createError } = await supabase
      .from('notifications')
      .insert(notificationInserts)
      .select('id')

    if (createError) {
      console.error('Failed to create in-app notifications:', createError)
      errors.push(`In-app notifications failed: ${createError.message}`)
    } else if (createdNotifications) {
      inAppNotificationIds.push(...createdNotifications.map(n => n.id))
      console.log(`✅ Created ${createdNotifications.length} in-app notifications`)
    }

    // Step 2: Create user_notification_reads entries (initially unread)
    // The notifications table doesn't track read status - user_notification_reads does
    // Users who haven't read will NOT appear in this table
    // So we don't insert anything here - they'll be inserted when user marks as read

    // Step 3: Send push notifications to users who have it enabled
    if (params.preferenceKey) {
      // Get player IDs for users who should receive push notifications
      const usersToNotify: string[] = []
      
      for (const userId of params.userIds) {
        const canSendPush = await shouldSendPushNotification(userId, params.preferenceKey)
        if (canSendPush) {
          usersToNotify.push(userId)
        }
      }
      
      if (usersToNotify.length > 0) {
        try {
          await sendPushNotification({
            userIds: usersToNotify,
            title: `${companyName}: ${params.title}`,
            message: params.message,
            url: params.pushUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin/notifications`,
            data: {
              ...params.pushData,
              type: params.preferenceKey,
              icon: params.icon,
              image: params.image,
            },
          })
          pushNotificationsSent = usersToNotify.length
          console.log(`✅ Sent push notification to ${usersToNotify.length} user(s)`)
        } catch (pushError) {
          console.error('Failed to send push notifications:', pushError)
          errors.push('Push notification failed')
        }
      } else {
        console.log('⚠️  No users have push notifications enabled for this type')
      }
    } else {
      console.log('⚠️  No preference key provided, skipping push notifications')
    }

    return {
      success: errors.length === 0,
      inAppNotificationIds,
      pushNotificationsSent,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('Unified notification error:', error)
    return {
      success: false,
      inAppNotificationIds: [],
      pushNotificationsSent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Helper: Send notification to all assigned users on a lead
 */
export async function notifyLeadAssignedUsers(params: {
  leadId: string
  title: string
  message: string
  priority?: UnifiedNotificationPriority
  pushUrl?: string
  pushData?: Record<string, any>
  preferenceKey?: UnifiedNotificationParams['preferenceKey']
}): Promise<void> {
  const supabase = await createClient()

  try {
    // Get all assigned users for this lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id, company_id, location_id')
      .eq('id', params.leadId)
      .single()

    if (leadError || !lead) {
      console.error('Lead not found:', leadError)
      return
    }

    const assignedUserIds = [
      lead.sales_rep_id,
      lead.marketing_rep_id,
      lead.sales_manager_id,
      lead.production_manager_id,
    ].filter((id): id is string => !!id)

    if (assignedUserIds.length === 0) {
      console.log('No users assigned to lead, skipping notification')
      return
    }

    // Get company details for icon
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', lead.company_id)
      .single()

    await createUnifiedNotification({
      userIds: assignedUserIds,
      title: params.title,
      message: params.message,
      type: 'user',
      priority: params.priority || 'medium',
      locationId: lead.location_id || undefined,
      pushUrl: params.pushUrl,
      pushData: params.pushData,
      icon: company?.logo_url || undefined,
      image: company?.logo_url || undefined,
      preferenceKey: params.preferenceKey || 'lead_assigned',
    })
  } catch (error) {
    console.error('Failed to notify lead assigned users:', error)
  }
}
