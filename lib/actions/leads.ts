'use server'

/**
 * Lead Server Actions
 * 
 * Server-side actions that trigger notifications after lead operations.
 * These wrap the client API calls with server-side notification logic.
 */

import { createClient } from '@/lib/supabase/server'
import { 
  notifyNewLead, 
  notifyLeadAssigned, 
  notifyLeadStatusChanged 
} from '@/lib/email/user-notifications'
import { createUnifiedNotification } from '@/lib/api/unified-notifications'
import { LeadInsert, LeadUpdate } from '@/lib/types'
import { revalidatePath } from 'next/cache'

/**
 * Create a lead and send notifications
 */
export async function createLeadAction(
  companyId: string,
  lead: LeadInsert,
  currentUserId: string
) {
  console.log('[CREATE LEAD ACTION] Called with:', { 
    companyId, 
    leadName: lead.full_name, 
    sales_rep_id: (lead as any).sales_rep_id || (lead as any).assigned_to,
    marketing_rep_id: (lead as any).marketing_rep_id,
    sales_manager_id: (lead as any).sales_manager_id,
    production_manager_id: (lead as any).production_manager_id,
    currentUserId 
  })
  
  try {
    const supabase = await createClient()
    
    // Map assigned_to to sales_rep_id for backward compatibility
    const leadData = {
      ...lead,
      company_id: companyId,
      created_by: currentUserId,
      sales_rep_id: (lead as any).sales_rep_id || (lead as any).assigned_to || null,
      marketing_rep_id: (lead as any).marketing_rep_id || null,
      sales_manager_id: (lead as any).sales_manager_id || null,
      production_manager_id: (lead as any).production_manager_id || null,
    }
    
    // Remove old assigned_to field
    delete (leadData as any).assigned_to
    
    // Create the lead
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData as any)
      .select()
      .single()

    if (error) {
      console.error('[CREATE LEAD ACTION] Database error:', error)
      throw error
    }

    console.log('[CREATE LEAD ACTION] Lead created successfully:', data.id)

    // Send unified notifications (in-app + push) to all assigned users
    const assignedUserIds = [
      (data as any).sales_rep_id,
      (data as any).marketing_rep_id,
      (data as any).sales_manager_id,
      (data as any).production_manager_id,
    ].filter((id): id is string => !!id)
    
    // Remove duplicates
    const uniqueAssignedUserIds = Array.from(new Set(assignedUserIds))

    if (uniqueAssignedUserIds.length > 0) {
      console.log('[CREATE LEAD ACTION] Sending unified notifications to:', uniqueAssignedUserIds)
      
      // Use new unified notification system
      await createUnifiedNotification({
        userIds: uniqueAssignedUserIds,
        title: '🎯 New Lead Assigned',
        message: `New lead: ${lead.full_name} - ${lead.service_type || 'Unknown service'} at ${lead.address || 'No address'}`,
        type: 'user',
        priority: 'high',
        locationId: (data as any).location_id || undefined,
        referenceType: 'lead',
        referenceId: data.id,
        pushUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${data.id}`,
        pushData: {
          leadId: data.id,
          leadName: lead.full_name,
          serviceType: lead.service_type,
        },
        preferenceKey: 'new_leads',
      }).catch(err => console.error('Failed to send unified notifications:', err))
    } else {
      console.log('[CREATE LEAD ACTION] No users assigned - skipping notifications')
    }

    revalidatePath('/admin/leads')
    return { success: true, data }
  } catch (error) {
    console.error('[CREATE LEAD ACTION] Error caught:', error)
    console.error('[CREATE LEAD ACTION] Error type:', typeof error)
    console.error('[CREATE LEAD ACTION] Error details:', JSON.stringify(error, null, 2))
    return { 
      success: false, 
      error: error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error))
    }
  }
}

/**
 * Update a lead and send notifications for status changes or reassignments
 */
export async function updateLeadAction(
  companyId: string,
  leadId: string,
  updates: LeadUpdate,
  currentUserId: string
) {
  try {
    const supabase = await createClient()
    
    // Get current lead state for comparison
    const { data: currentLead } = await supabase
      .from('leads')
      .select('sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id, status, full_name, assigned_to')
      .eq('id', leadId)
      .eq('company_id', companyId)
      .single()

    // Map assigned_to to sales_rep_id for backward compatibility
    const updateData = {
      ...updates,
      sales_rep_id: (updates as any).sales_rep_id || (updates as any).assigned_to || null,
      marketing_rep_id: (updates as any).marketing_rep_id || null,
      sales_manager_id: (updates as any).sales_manager_id || null,
      production_manager_id: (updates as any).production_manager_id || null,
    }
    
    // Remove old assigned_to field
    delete (updateData as any).assigned_to

    // Update the lead
    const { data, error } = await supabase
      .from('leads')
      .update(updateData as any)
      .eq('company_id', companyId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error

    // Check for any assignment changes and notify newly assigned users
    if (currentLead) {
      const assignmentChanges = [
        { field: 'sales_rep_id', old: (currentLead as any).sales_rep_id, new: (data as any).sales_rep_id },
        { field: 'marketing_rep_id', old: (currentLead as any).marketing_rep_id, new: (data as any).marketing_rep_id },
        { field: 'sales_manager_id', old: (currentLead as any).sales_manager_id, new: (data as any).sales_manager_id },
        { field: 'production_manager_id', old: (currentLead as any).production_manager_id, new: (data as any).production_manager_id },
      ]

      // Also check old assigned_to field for backward compatibility
      if (currentLead.assigned_to && (updateData as any).sales_rep_id && 
          currentLead.assigned_to !== (updateData as any).sales_rep_id) {
        assignmentChanges.push({ 
          field: 'sales_rep_id', 
          old: currentLead.assigned_to, 
          new: (updateData as any).sales_rep_id 
        })
      }

      for (const change of assignmentChanges) {
        if (change.new && change.new !== change.old && change.new !== currentUserId) {
          await notifyLeadAssigned({
            assignedToUserId: change.new,
            assignedByUserId: currentUserId,
            companyId,
            leadId,
            leadName: data.full_name,
            serviceType: data.service_type || 'Unknown',
            address: data.address,
          }).catch(err => console.error(`Failed to send lead assigned notification for ${change.field}:`, err))
        }
      }
    }

    // Check if status changed
    if (currentLead && (updates as any).status && (updates as any).status !== currentLead.status) {
      // Notify all assigned users
      const assignedUserIds = [
        (data as any).sales_rep_id,
        (data as any).marketing_rep_id,
        (data as any).sales_manager_id,
        (data as any).production_manager_id,
      ].filter((id): id is string => !!id)

      for (const userId of assignedUserIds) {
        await notifyLeadStatusChanged({
          userId,
          companyId,
          leadId,
          leadName: data.full_name,
          oldStatus: currentLead.status,
          newStatus: (updates as any).status,
          changedByUserId: currentUserId,
          changedAt: new Date().toISOString(),
        }).catch(err => console.error(`Failed to send status change notification to ${userId}:`, err))
      }
    }

    revalidatePath('/admin/leads')
    revalidatePath(`/admin/leads/${leadId}`)
    return { success: true, data }
  } catch (error) {
    console.error('Update lead action error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
