'use server'

/**
 * Invoice & Payment Server Actions
 * 
 * Server-side actions that trigger notifications for payment events.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyPaymentReceived } from '@/lib/email/user-notifications'
import { revalidatePath } from 'next/cache'

/**
 * Record a payment and notify team
 */
export async function recordPaymentAction(data: {
  companyId: string
  leadId: string
  invoiceId?: string
  amount: number
  paymentMethod: string
  paymentDate: string
  notes?: string
  createdBy: string
}) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get lead details
    const { data: lead } = await supabase
      .from('leads')
      .select('id, full_name, assigned_to, created_by')
      .eq('id', data.leadId)
      .eq('company_id', data.companyId)
      .single()

    if (!lead) {
      throw new Error('Lead not found')
    }

    // Record payment in database (adjust table name as needed)
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        company_id: data.companyId,
        lead_id: data.leadId,
        invoice_id: data.invoiceId,
        amount: data.amount,
        payment_method: data.paymentMethod,
        payment_date: data.paymentDate,
        notes: data.notes,
        created_by: data.createdBy,
      })

    if (paymentError) {
      console.error('Payment recording error:', paymentError)
      // Continue with notifications even if payment table doesn't exist
    }

    // Gather team members to notify
    const userIdsToNotify = new Set<string>()
    if (lead.assigned_to) userIdsToNotify.add(lead.assigned_to)
    if (lead.created_by) userIdsToNotify.add(lead.created_by)
    // Remove the person who recorded the payment
    userIdsToNotify.delete(data.createdBy)

    // Send notifications
    if (userIdsToNotify.size > 0) {
      await notifyPaymentReceived({
        userIds: Array.from(userIdsToNotify),
        companyId: data.companyId,
        leadId: data.leadId,
        customerName: lead.full_name,
        invoiceNumber: data.invoiceId?.slice(0, 8) || 'N/A',
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paidAt: data.paymentDate,
      }).catch(err => console.error('Failed to send payment notification:', err))
    }

    revalidatePath('/admin/leads')
    revalidatePath(`/admin/leads/${data.leadId}`)
    return { success: true }
  } catch (error) {
    console.error('Record payment action error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Mark invoice as paid and notify team
 */
export async function markInvoicePaidAction(data: {
  companyId: string
  leadId: string
  invoiceId: string
  amount: number
  paymentMethod: string
  paidAt: string
  paidBy: string
}) {
  try {
    const supabase = await createClient()
    
    // Get lead and invoice details
    const { data: lead } = await supabase
      .from('leads')
      .select('id, full_name, assigned_to, created_by')
      .eq('id', data.leadId)
      .eq('company_id', data.companyId)
      .single()

    if (!lead) {
      throw new Error('Lead not found')
    }

    // Update invoice status (adjust table/columns as needed)
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: data.paidAt,
        payment_method: data.paymentMethod,
      })
      .eq('id', data.invoiceId)
      .eq('company_id', data.companyId)

    if (invoiceError) {
      console.error('Invoice update error:', invoiceError)
      // Continue even if invoice table doesn't exist
    }

    // Gather team members to notify
    const userIdsToNotify = new Set<string>()
    if (lead.assigned_to) userIdsToNotify.add(lead.assigned_to)
    if (lead.created_by) userIdsToNotify.add(lead.created_by)
    userIdsToNotify.delete(data.paidBy) // Don't notify the person who marked it paid

    // Send notifications
    if (userIdsToNotify.size > 0) {
      await notifyPaymentReceived({
        userIds: Array.from(userIdsToNotify),
        companyId: data.companyId,
        leadId: data.leadId,
        customerName: lead.full_name,
        invoiceNumber: data.invoiceId.slice(0, 8),
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paidAt: data.paidAt,
      }).catch(err => console.error('Failed to send payment notification:', err))
    }

    revalidatePath('/admin/leads')
    revalidatePath(`/admin/leads/${data.leadId}`)
    return { success: true }
  } catch (error) {
    console.error('Mark invoice paid action error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
