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
import { sendEmail } from '@/lib/email/resend'

/**
 * Check if user wants email notifications for this type
 */
async function shouldSendEmailNotification(
  userId: string,
  notificationType: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('email_notifications, notification_preferences, email')
    .eq('id', userId)
    .single()

  console.log(`📧 shouldSendEmailNotification for user ${userId}:`, {
    found: !!data,
    email: data?.email,
    email_notifications: data?.email_notifications,
    notification_preferences: data?.notification_preferences,
    notificationType,
    specificPref: data?.notification_preferences?.[notificationType],
    error
  })

  if (error || !data) {
    console.log(`📧 User ${userId} not found or error:`, error)
    return false
  }
  
  // Check master email toggle
  if (!data.email_notifications) {
    console.log(`📧 User ${userId} has email_notifications disabled`)
    return false
  }
  
  // Check specific notification preference
  const specificPref = data.notification_preferences?.[notificationType]
  const shouldSend = specificPref !== false // Default to true if not explicitly disabled
  
  console.log(`📧 User ${userId} final decision: ${shouldSend}`)
  return shouldSend
}

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
  
  // Email notification extras
  emailSubject?: string // Custom email subject (defaults to title)
  emailHtml?: string // Custom HTML email body
  
  // Preference key (what type of notification this is for checking user preferences)
  preferenceKey?: 'new_leads' | 'new_note' | 'lead_assigned' | 'lead_status_change' | 
                  'appointment_scheduled' | 'appointment_reminders' | 
                  'quote_sent' | 'quote_approved' | 'contract_signed' | 
                  'invoice_overdue' | 'payment_received' | 
                  'production_scheduled' | 'project_milestone' | 
                  'crew_assignment' | 'material_delivery'
}

/**
 * Create a unified notification (in-app + push + email)
 * 
 * This function:
 * 1. Creates in-app notification records for all specified users
 * 2. Checks each user's notification preferences
 * 3. Sends push notifications to users who have it enabled
 * 4. Sends email notifications to users who have it enabled
 */
export async function createUnifiedNotification(params: UnifiedNotificationParams): Promise<{
  success: boolean
  inAppNotificationIds: string[]
  pushNotificationsSent: number
  emailNotificationsSent: number
  errors?: string[]
}> {
  const supabase = await createClient()
  const errors: string[] = []
  const inAppNotificationIds: string[] = []
  let pushNotificationsSent = 0
  let emailNotificationsSent = 0

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
    // DISABLED: Push notifications temporarily disabled
    console.log('⚠️  Push notifications are currently disabled')
    // if (params.preferenceKey) {
    //   // Get player IDs for users who should receive push notifications
    //   const usersToNotify: string[] = []
    //   
    //   for (const userId of params.userIds) {
    //     const canSendPush = await shouldSendPushNotification(userId, params.preferenceKey)
    //     if (canSendPush) {
    //       usersToNotify.push(userId)
    //     }
    //   }
    //   
    //   if (usersToNotify.length > 0) {
    //     try {
    //       // Fetch player IDs from database for users who should receive notifications
    //       const { data: usersWithPlayerIds } = await supabase
    //         .from('users')
    //         .select('id, onesignal_player_id')
    //         .in('id', usersToNotify)
    //         .not('onesignal_player_id', 'is', null)
    //       
    //       const playerIds = (usersWithPlayerIds || [])
    //         .map(u => u.onesignal_player_id)
    //         .filter(Boolean) as string[]
    //       
    //       console.log(`📱 Found ${playerIds.length} player IDs for ${usersToNotify.length} users`)
    //       
    //       if (playerIds.length > 0) {
    //         await sendPushNotification({
    //           playerIds,
    //           title: `${companyName}: ${params.title}`,
    //           message: params.message,
    //           url: params.pushUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin/notifications`,
    //           data: {
    //           ...params.pushData,
    //           type: params.preferenceKey,
    //           icon: params.icon,
    //           image: params.image,
    //         },
    //       })
    //         pushNotificationsSent = playerIds.length
    //         console.log(`✅ Sent push notification to ${playerIds.length} player ID(s)`)
    //       } else {
    //         console.log('⚠️  No player IDs found for users who should receive notifications')
    //       }
    //     } catch (pushError) {
    //       console.error('Failed to send push notifications:', pushError)
    //       errors.push('Push notification failed')
    //     }
    //   } else {
    //     console.log('⚠️  No users have push notifications enabled for this type')
    //   }
    // } else {
    //   console.log('⚠️  No preference key provided, skipping push notifications')
    // }

    // Step 4: Send email notifications to users who have it enabled
    if (params.preferenceKey) {
      console.log('📧 EMAIL NOTIFICATION FLOW START')
      console.log('   Preference key:', params.preferenceKey)
      console.log('   Target user IDs:', params.userIds)
      
      const usersToEmail: string[] = []
      
      for (const userId of params.userIds) {
        const canSendEmail = await shouldSendEmailNotification(userId, params.preferenceKey)
        console.log(`   User ${userId} - canSendEmail:`, canSendEmail)
        if (canSendEmail) {
          usersToEmail.push(userId)
        }
      }
      
      console.log('📧 Users to email after filtering:', usersToEmail)
      
      if (usersToEmail.length > 0) {
        try {
          // Fetch user emails
          const { data: usersWithEmails, error: fetchError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .in('id', usersToEmail)
          
          console.log('📧 Fetched user emails:', usersWithEmails)
          if (fetchError) console.error('📧 Error fetching emails:', fetchError)
          
          if (usersWithEmails && usersWithEmails.length > 0) {
            // Generate email HTML with simple notification template
            // Use more natural subject line without emoji to avoid spam filters
            const naturalTitle = params.title.replace(/[📝🎯📋✅🎉📅💰🔔]/g, '').trim()
            const emailSubject = params.emailSubject || `${naturalTitle} - ${companyName}`
            
            // Generate plain text version (important for spam filters)
            const emailText = params.emailHtml ? '' : `
Hi there,

${params.message}

${params.pushUrl ? `View in Dashboard: ${params.pushUrl}` : ''}

Best regards,
Your ${companyName} Team

---
You're receiving this because you're assigned to this lead.
Manage preferences: ${process.env.NEXT_PUBLIC_APP_URL}/admin/profile

Ketterly, LLC | Georgetown, TX 78626 | support@ketterly.com
            `.trim()
            
            const emailHtml = params.emailHtml || `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${emailSubject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <!-- Preheader text for better inbox preview -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${params.message.substring(0, 100)}...
  </div>
  <!--[if mso]>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center">
  <![endif]-->
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 24px 40px;">
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">Hi there,</p>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${params.message}
              </p>
            </td>
          </tr>
          ${params.pushUrl ? `
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <a href="${params.pushUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
                View in Dashboard
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 24px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Best regards,<br>
                Your ${companyName} Team
              </p>
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                You're receiving this because you're assigned to this lead. <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/profile" style="color: #2563eb; text-decoration: none;">Manage email preferences</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                Ketterly, LLC | Georgetown, TX 78626 | support@ketterly.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]>
    </td></tr>
  </table>
  <![endif]-->
</body>
</html>
            `
            
            console.log('📧 EMAIL DETAILS:')
            console.log('   Subject:', emailSubject)
            console.log('   From:', process.env.RESEND_FROM_EMAIL || `${companyName} <notifications@ketterly.com>`)
            console.log('   Recipients:', usersWithEmails.map(u => u.email))
            
            // Send emails in parallel
            const emailPromises = usersWithEmails.map(user => {
              console.log(`📧 Sending email to ${user.email}...`)
              return sendEmail({
                from: `${companyName} <${process.env.RESEND_FROM_EMAIL || 'notifications@ketterly.com'}>`,
                to: user.email,
                replyTo: process.env.RESEND_REPLY_TO_EMAIL || process.env.RESEND_FROM_EMAIL || 'support@ketterly.com',
                subject: emailSubject,
                html: emailHtml,
                text: emailText,
              }).then(result => {
                console.log(`📧 Email result for ${user.email}:`, result)
                return result
              }).catch(err => {
                console.error(`📧 Email error for ${user.email}:`, err)
                return null
              })
            })
            
            const emailResults = await Promise.all(emailPromises)
            const successfulEmails = emailResults.filter(r => r?.success).length
            
            console.log('📧 EMAIL RESULTS:')
            console.log('   Total attempts:', emailResults.length)
            console.log('   Successful:', successfulEmails)
            console.log('   Failed:', emailResults.length - successfulEmails)
            console.log('   Full results:', emailResults)
            
            emailNotificationsSent = successfulEmails
            console.log(`✅ Sent ${successfulEmails} email notifications`)
            
            if (successfulEmails < usersWithEmails.length) {
              errors.push(`${usersWithEmails.length - successfulEmails} emails failed to send`)
            }
          }
        } catch (emailError) {
          console.error('Failed to send email notifications:', emailError)
          errors.push('Email notification failed')
        }
      } else {
        console.log('⚠️  No users have email notifications enabled for this type')
      }
    } else {
      console.log('⚠️  No preference key provided, skipping email notifications')
    }

    return {
      success: errors.length === 0,
      inAppNotificationIds,
      pushNotificationsSent,
      emailNotificationsSent,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('Unified notification error:', error)
    return {
      success: false,
      inAppNotificationIds: [],
      pushNotificationsSent: 0,
      emailNotificationsSent: 0,
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
