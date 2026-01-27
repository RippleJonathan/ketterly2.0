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
      console.log('📝 NOTE NOTIFICATION TRIGGER')
      console.log('   Activity type:', activity.activity_type)
      console.log('   Entity type:', activity.entity_type)
      console.log('   Entity ID:', activity.entity_id)
      console.log('   Created by:', activity.created_by)
      
      try {
        // Get the lead to find assigned users
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id, full_name')
          .eq('id', activity.entity_id)
          .single()
        
        console.log('   Lead query result:', { lead, error: leadError })
        
        if (lead) {
          console.log('   Lead found:', lead.full_name)
          console.log('   Assigned users:', {
            sales_rep: lead.sales_rep_id,
            marketing_rep: lead.marketing_rep_id,
            sales_manager: lead.sales_manager_id,
            production_manager: lead.production_manager_id
          })
          
          const allAssignedUsers = [
            lead.sales_rep_id,
            lead.marketing_rep_id,
            lead.sales_manager_id,
            lead.production_manager_id
          ].filter((id): id is string => !!id)
          
          console.log('   All assigned users (before filter):', allAssignedUsers)
          
          const assignedUsers = allAssignedUsers.filter(id => id !== activity.created_by)
          
          console.log('   Assigned users (after filtering creator):', assignedUsers)
          console.log('   Note creator will NOT be notified:', activity.created_by)
          
          if (assignedUsers.length > 0) {
            console.log('📝 ✅ Sending note notifications to:', assignedUsers)
            
            const result = await createUnifiedNotification({
              userIds: assignedUsers,
              title: '📝 New Note Added',
              message: `${activity.title}${activity.description ? ': ' + activity.description.substring(0, 100) : ''}`,
              type: 'user',
              priority: 'low',
              referenceType: 'lead',
              referenceId: activity.entity_id,
              pushUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${activity.entity_id}`,
              preferenceKey: 'new_note',
            })
            
            console.log('📝 Notification result:', result)
          } else {
            console.log('📝 ⚠️  No users to notify (all assigned users are the note creator)')
            console.log('   TIP: Assign the lead to another user to test notifications')
          }
        } else {
          console.log('📝 ❌ Lead not found')
        }
      } catch (notifError) {
        console.error('📝 ❌ Failed to send note notifications:', notifError)
      }
    } else {
      console.log('   Skipping notification - not a note on a lead')
    }

    return { success: true, data }
  } catch (error) {
    console.error('Create activity exception:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
