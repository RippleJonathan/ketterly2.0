'use server'

/**
 * Quote & Contract Server Actions
 * 
 * Server-side actions that trigger notifications for quote/contract events.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  notifyQuoteApproved,
  notifyContractSigned,
} from '@/lib/email/user-notifications'
import { autoCreateCommission } from '@/lib/utils/auto-commission'
import { revalidatePath } from 'next/cache'

/**
 * Accept a quote and notify team
 */
export async function acceptQuoteAction(
  companyId: string,
  quoteId: string
) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get quote with lead details
    const { data: quote } = await supabase
      .from('quotes')
      .select('*, lead:leads!inner(id, full_name, assigned_to, created_by)')
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .single()

    if (!quote) {
      throw new Error('Quote not found')
    }

    // Update quote status
    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error

    // Gather team members to notify (assigned user + creator)
    const userIdsToNotify = new Set<string>()
    if (quote.lead?.assigned_to) userIdsToNotify.add(quote.lead.assigned_to)
    if (quote.lead?.created_by) userIdsToNotify.add(quote.lead.created_by)

    // Send notifications to team
    if (userIdsToNotify.size > 0) {
      await notifyQuoteApproved({
        userIds: Array.from(userIdsToNotify),
        companyId,
        leadId: quote.lead_id,
        quoteId,
        customerName: quote.lead.full_name,
        quoteNumber: quote.quote_number || quoteId.slice(0, 8),
        totalAmount: quote.grand_total || 0,
        approvedAt: new Date().toISOString(),
      }).catch(err => console.error('Failed to send quote approved notification:', err))
    }

    revalidatePath('/admin/leads')
    revalidatePath(`/admin/leads/${quote.lead_id}`)
    return { success: true, data }
  } catch (error) {
    console.error('Accept quote action error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Mark contract as signed and notify team
 */
export async function signContractAction(data: {
  companyId: string
  leadId: string
  quoteId: string
  signatureData: string
  customerName: string
  customerEmail: string
  signedAt: string
}) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get lead and quote details
    const { data: lead } = await supabase
      .from('leads')
      .select('id, full_name, assigned_to, created_by, sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id')
      .eq('id', data.leadId)
      .eq('company_id', data.companyId)
      .single()

    const { data: quote } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', data.quoteId)
      .eq('company_id', data.companyId)
      .single()

    if (!lead || !quote) {
      throw new Error('Lead or quote not found')
    }

    // Update quote with signature
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: data.signedAt,
        signature_data: data.signatureData,
        signed_by_name: data.customerName,
        signed_by_email: data.customerEmail,
      })
      .eq('id', data.quoteId)
      .eq('company_id', data.companyId)

    if (updateError) throw updateError

    // Gather team members to notify
    const userIdsToNotify = new Set<string>()
    if (lead.assigned_to) userIdsToNotify.add(lead.assigned_to)
    if (lead.created_by) userIdsToNotify.add(lead.created_by)

    // Send notifications
    if (userIdsToNotify.size > 0) {
      await notifyContractSigned({
        userIds: Array.from(userIdsToNotify),
        companyId: data.companyId,
        leadId: data.leadId,
        customerName: data.customerName,
        contractNumber: quote.quote_number || data.quoteId.slice(0, 8),
        totalAmount: quote.grand_total || 0,
        signedAt: data.signedAt,
      }).catch(err => console.error('Failed to send contract signed notification:', err))
    }

    // Auto-create/update commissions for all assigned users when contract is signed
    // Map users to their assignment fields to use correct commission rates
    const userFieldMap: Array<{ userId: string, field: 'sales_rep_id' | 'marketing_rep_id' | 'sales_manager_id' | 'production_manager_id' }> = []
    
    if (lead.sales_rep_id) userFieldMap.push({ userId: lead.sales_rep_id, field: 'sales_rep_id' })
    if (lead.marketing_rep_id) userFieldMap.push({ userId: lead.marketing_rep_id, field: 'marketing_rep_id' })
    if (lead.sales_manager_id) userFieldMap.push({ userId: lead.sales_manager_id, field: 'sales_manager_id' })
    if (lead.production_manager_id) userFieldMap.push({ userId: lead.production_manager_id, field: 'production_manager_id' })

    // Create commissions for each assigned user (non-blocking)
    // Pass skipCancelOthers=true to support multiple users having commissions simultaneously
    for (const { userId, field } of userFieldMap) {
      autoCreateCommission(data.leadId, userId, data.companyId, null, field, true)
        .catch(err => console.error(`Failed to auto-create commission for ${field}:`, err))
    }

    revalidatePath('/admin/leads')
    revalidatePath(`/admin/leads/${data.leadId}`)
    return { success: true }
  } catch (error) {
    console.error('Sign contract action error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
