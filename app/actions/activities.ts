'use server'

import { createClient } from '@/lib/supabase/server'
import { createUnifiedNotification } from '@/lib/api/unified-notifications'
import type { ActivityInsert } from '@/lib/api/activities'

/**
 * Server action to create an activity with notifications
 */
export async function createActivityWithNotifications(
  companyId: string,
  activity: ActivityInsert
) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...activity,
        company_id: companyId,
      })
      .select()
      .single()

    if (error) {
      console.error('Create activity error:', error)
      return { success: false, error: error.message }
    }

    // Send notifications for notes on leads
    if (activity.activity_type === 'note' && activity.entity_type === 'lead') {
      try {
        // Get the lead to find assigned users
        const { data: lead } = await supabase
          .from('leads')
          .select('sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id, full_name')
          .eq('id', activity.entity_id)
          .single()
        
        if (lead) {
          const assignedUsers = [
            lead.sales_rep_id,
            lead.marketing_rep_id,
            lead.sales_manager_id,
            lead.production_manager_id
          ].filter((id): id is string => !!id && id !== activity.created_by) // Don't notify the note creator
          
          if (assignedUsers.length > 0) {
            console.log('📝 Sending note notifications to assigned users:', assignedUsers)
            
            await createUnifiedNotification({
              userIds: assignedUsers,
              title: '📝 New Note Added',
              message: `${activity.title}${activity.description ? ': ' + activity.description.substring(0, 100) : ''}`,
              type: 'user',
              priority: 'low',
              pushUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${activity.entity_id}`,
              preferenceKey: 'new_note',
            })
          }
        }
      } catch (notifError) {
        console.error('Failed to send note notifications:', notifError)
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Create activity exception:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
