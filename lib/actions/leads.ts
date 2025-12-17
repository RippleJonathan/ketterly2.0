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
  console.log('[CREATE LEAD ACTION] Called with:', { companyId, leadName: lead.full_name, assignedTo: lead.assigned_to, currentUserId })
  
  try {
    const supabase = await createClient()
    
    // Create the lead
    const { data, error } = await supabase
      .from('leads')
      .insert({ 
        ...lead, 
        company_id: companyId,
        created_by: currentUserId 
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[CREATE LEAD ACTION] Database error:', error)
      throw error
    }

    console.log('[CREATE LEAD ACTION] Lead created successfully:', data.id)

    // Send notification to assigned user (if different from creator)
    if (data && lead.assigned_to) {
      if (lead.assigned_to !== currentUserId) {
        console.log('[CREATE LEAD ACTION] Sending notification to:', lead.assigned_to)
        await notifyNewLead({
          userId: lead.assigned_to,
          companyId,
          leadId: data.id,
          leadName: lead.full_name,
          leadEmail: lead.email,
          leadPhone: lead.phone,
          serviceType: lead.service_type || 'Unknown',
          address: lead.address,
          source: lead.source || 'Unknown',
          createdAt: data.created_at,
        }).catch(err => console.error('Failed to send new lead notification:', err))
      } else {
        console.log('[CREATE LEAD ACTION] Skipping notification - user assigned lead to themselves')
      }
    } else {
      console.log('[CREATE LEAD ACTION] No assigned user - skipping notification')
    }

    revalidatePath('/admin/leads')
    return { success: true, data }
  } catch (error) {
    console.error('Create lead action error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
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
      .select('assigned_to, status, full_name')
      .eq('id', leadId)
      .eq('company_id', companyId)
      .single()

    // Update the lead
    const { data, error } = await supabase
      .from('leads')
      .update(updates as any)
      .eq('company_id', companyId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error

    // Check if assignment changed
    if (currentLead && updates.assigned_to && updates.assigned_to !== currentLead.assigned_to) {
      await notifyLeadAssigned({
        assignedToUserId: updates.assigned_to,
        assignedByUserId: currentUserId,
        companyId,
        leadId,
        leadName: data.full_name,
        serviceType: data.service_type || 'Unknown',
        address: data.address,
      }).catch(err => console.error('Failed to send lead assigned notification:', err))
    }

    // Check if status changed
    if (currentLead && updates.status && updates.status !== currentLead.status) {
      // Notify the assigned user (if exists)
      if (data.assigned_to) {
        await notifyLeadStatusChanged({
          userId: data.assigned_to,
          companyId,
          leadId,
          leadName: data.full_name,
          oldStatus: currentLead.status,
          newStatus: updates.status,
          changedByUserId: currentUserId,
          changedAt: new Date().toISOString(),
        }).catch(err => console.error('Failed to send status change notification:', err))
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
