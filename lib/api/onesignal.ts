/**
 * OneSignal Push Notification API
 * 
 * Server-side functions to send push notifications via OneSignal REST API
 */

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1'

interface OneSignalNotification {
  app_id: string
  headings: { en: string }
  contents: { en: string }
  url?: string
  data?: Record<string, any>
  include_external_user_ids?: string[] // User IDs from your database
  included_segments?: string[] // e.g., ['All', 'Active Users']
  chrome_web_icon?: string // Icon for Chrome/Edge/Firefox on desktop
  firefox_icon?: string // Icon for Firefox
  chrome_icon?: string // Icon for Chrome
  ios_attachments?: Record<string, string> // iOS rich media
  big_picture?: string // Android large image
  large_icon?: string // Android notification icon
}

/**
 * Send a push notification to specific users by their player IDs
 */
export async function sendPushNotification({
  userIds,
  title,
  message,
  url,
  data,
}: {
  userIds: string[] // Array of Supabase user IDs
  title: string
  message: string
  url?: string // Optional deep link URL
  data?: Record<string, any> // Optional custom data
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY

  if (!appId || !restApiKey) {
    console.error('OneSignal credentials not configured')
    return { success: false, error: 'OneSignal not configured' }
  }

  try {
    // Get player IDs from database for these user IDs
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient())
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id, onesignal_player_id')
      .in('id', userIds)
      .not('onesignal_player_id', 'is', null)
    
    if (dbError) {
      console.error('Failed to fetch player IDs:', dbError)
      return { success: false, error: 'Failed to fetch player IDs' }
    }
    
    const playerIds = users?.map(u => u.onesignal_player_id).filter(Boolean) as string[] || []
    
    if (playerIds.length === 0) {
      console.warn('⚠️  No player IDs found for users:', userIds)
      console.warn('⚠️  Users may not have subscribed to push notifications yet')
      return { success: false, error: 'No subscribed devices found' }
    }
    
    console.log('🔔 Found player IDs:', playerIds)
    
    const notification: OneSignalNotification = {
      app_id: appId,
      headings: { en: title },
      contents: { en: message },
      include_player_ids: playerIds, // Use player IDs instead of external IDs
      url: url || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
    }

    console.log('🔔 Sending push notification:', {
      title,
      message,
      targetUserIds: userIds,
      playerIds,
      url: notification.url,
    })

    if (data) {
      // Extract icon and image if provided
      const { icon, image, ...customData } = data
      
      // Set icons for different platforms
      if (icon) {
        notification.chrome_web_icon = icon
        notification.firefox_icon = icon
        notification.chrome_icon = icon
        notification.large_icon = icon
      }
      
      // Set large image for Android/Desktop
      if (image) {
        notification.big_picture = image
        notification.ios_attachments = { id1: image }
      }
      
      // Set remaining custom data only if there's any
      if (Object.keys(customData).length > 0) {
        notification.data = customData
      }
    }

    const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(notification),
    })

    const result = await response.json()

    console.log('🔔 OneSignal API full response:', result)
    console.log('🔔 OneSignal API parsed:', {
      success: response.ok,
      recipients: result.recipients,
      externalIds: result.external_ids,
      errors: result.errors,
    })

    // Check if recipients is 0 or undefined (no devices matched)
    if (response.ok && (!result.recipients || result.recipients === 0)) {
      console.warn('⚠️  WARNING: Notification accepted but NO RECIPIENTS matched!', {
        targetedUserIds: userIds,
        reason: 'External IDs not found in OneSignal - users may not have logged in yet or external_id not set',
      })
    }

    if (!response.ok) {
      console.error('OneSignal API error:', result)
      return { 
        success: false, 
        error: result.errors?.join(', ') || 'Failed to send notification' 
      }
    }

    console.log('✅ Push notification sent:', result.id)
    return { success: true, id: result.id }
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Send a push notification to all users (use sparingly!)
 */
export async function sendPushNotificationToAll({
  title,
  message,
  url,
  data,
}: {
  title: string
  message: string
  url?: string
  data?: Record<string, any>
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY

  if (!appId || !restApiKey) {
    return { success: false, error: 'OneSignal not configured' }
  }

  try {
    const notification: OneSignalNotification = {
      app_id: appId,
      headings: { en: title },
      contents: { en: message },
      included_segments: ['All'], // Send to all subscribed users
      url: url || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000', // Always provide valid URL
    }

    if (data) {
      // Extract icon and image if provided
      const { icon, image, ...customData } = data
      
      // Set icons for different platforms
      if (icon) {
        notification.chrome_web_icon = icon
        notification.firefox_icon = icon
        notification.chrome_icon = icon
        notification.large_icon = icon
      }
      
      // Set large image for Android/Desktop
      if (image) {
        notification.big_picture = image
        notification.ios_attachments = { id1: image }
      }
      
      // Set remaining custom data only if there's any
      if (Object.keys(customData).length > 0) {
        notification.data = customData
      }
    }

    const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(notification),
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        success: false, 
        error: result.errors?.join(', ') || 'Failed to send notification' 
      }
    }

    return { success: true, id: result.id }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Set external user ID for a OneSignal player
 * Call this after user logs in to link their OneSignal subscription to their user ID
 */
export async function setOneSignalExternalUserId(userId: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const OneSignal = (await import('react-onesignal')).default
    await OneSignal.login(userId)
    console.log('✅ OneSignal external user ID set:', userId)
  } catch (error) {
    console.error('Failed to set OneSignal external user ID:', error)
  }
}

/**
 * Remove external user ID (call on logout)
 */
export async function removeOneSignalExternalUserId(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const OneSignal = (await import('react-onesignal')).default
    await OneSignal.logout()
    console.log('✅ OneSignal external user ID removed')
  } catch (error) {
    console.error('Failed to remove OneSignal external user ID:', error)
  }
}
