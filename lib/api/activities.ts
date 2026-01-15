import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/types/api'

export interface Activity {
  id: string
  company_id: string
  entity_type: 'lead' | 'customer' | 'quote' | 'project' | 'invoice'
  entity_id: string
  activity_type: 'note' | 'call' | 'email' | 'sms' | 'meeting' | 'status_change' | 'file_upload' | 'payment' | 'other'
  title: string
  description?: string
  metadata?: Record<string, any>
  created_by?: string
  created_by_user?: {
    id: string
    full_name: string
    email: string
  }
  created_at: string
  deleted_at?: string
}

export interface ActivityInsert {
  entity_type: Activity['entity_type']
  entity_id: string
  activity_type: Activity['activity_type']
  title: string
  description?: string
  metadata?: Record<string, any>
  created_by?: string
}

/**
 * Get activities for a specific entity
 */
export async function getActivities(
  companyId: string,
  entityType: Activity['entity_type'],
  entityId: string
): Promise<ApiResponse<Activity[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        created_by_user:users!activities_created_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('company_id', companyId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get activities error:', error)
      return createErrorResponse(error)
    }

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Get activities exception:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a new activity
 */
export async function createActivity(
  companyId: string,
  activity: ActivityInsert
): Promise<ApiResponse<Activity>> {
  try {
    const supabase = createClient()
    
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
      return createErrorResponse(error)
    }

    // Send notifications for notes on leads/jobs
    if (activity.activity_type === 'note' && activity.entity_type === 'lead') {
      // Import server-side notification function
      try {
        const { createUnifiedNotification } = await import('@/lib/api/unified-notifications')
        
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
        // Don't fail the activity creation if notifications fail
        console.error('Failed to send note notifications:', notifError)
      }
    }

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Create activity exception:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a status change activity
 */
export async function createStatusChangeActivity(
  companyId: string,
  entityType: Activity['entity_type'],
  entityId: string,
  oldStatus: string,
  newStatus: string,
  userId?: string
): Promise<ApiResponse<Activity>> {
  const statusLabels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    quote_sent: 'Quote Sent',
    follow_up: 'Follow Up',
    won: 'Won',
    invoiced: 'Invoiced',
    closed: 'Closed',
    lost: 'Lost',
    archived: 'Archived',
  }

  return createActivity(companyId, {
    entity_type: entityType,
    entity_id: entityId,
    activity_type: 'status_change',
    title: `Status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus] || newStatus}`,
    metadata: {
      old_status: oldStatus,
      new_status: newStatus,
    },
    created_by: userId,
  })
}

/**
 * Delete an activity (soft delete)
 */
export async function deleteActivity(
  companyId: string,
  activityId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('activities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', activityId)
      .eq('company_id', companyId)

    if (error) {
      console.error('Delete activity error:', error)
      return createErrorResponse(error)
    }

    return createSuccessResponse(undefined)
  } catch (error) {
    console.error('Delete activity exception:', error)
    return createErrorResponse(error)
  }
}
