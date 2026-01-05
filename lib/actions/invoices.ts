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
 * Get next payment number (server action for client use)
 */
export async function getNextPaymentNumberAction(companyId: string): Promise<string | null> {
  try {
    const adminSupabase = createAdminClient()
    const year = new Date().getFullYear()
    
    // Get ALL payments for this company and year (including deleted) to find max number
    const { data: allPayments, error } = await adminSupabase
      .from('payments')
      .select('payment_number')
      .eq('company_id', companyId)
      .like('payment_number', `PAY-${year}-%`)
      .order('payment_number', { ascending: false })
    
    if (error) {
      console.error('Error fetching payments for number generation:', error)
      return null
    }
    
    if (!allPayments || allPayments.length === 0) {
      return `PAY-${year}-001`
    }
    
    // Extract all numbers and find the maximum
    let maxNum = 0
    for (const payment of allPayments) {
      const match = payment.payment_number.match(/PAY-\d{4}-(\d+)/)
      if (match) {
        const num = parseInt(match[1])
        if (num > maxNum) {
          maxNum = num
        }
      }
    }
    
    // Increment and return
    const nextNum = (maxNum + 1).toString().padStart(3, '0')
    return `PAY-${year}-${nextNum}`
  } catch (error) {
    console.error('Error generating next payment number:', error)
    return null
  }
}

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
    
    // Get lead details (use admin client to bypass RLS in server action)
    const { data: lead, error: leadError } = await adminSupabase
      .from('leads')
      .select('id, full_name, created_by, sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id')
      .eq('id', data.leadId)
      .eq('company_id', data.companyId)
      .is('deleted_at', null)
      .single()

    if (leadError) {
      console.error('Error fetching lead:', leadError)
      throw new Error(`Lead query failed: ${leadError.message}`)
    }

    if (!lead) {
      console.error('Lead not found for ID:', data.leadId, 'Company:', data.companyId)
      throw new Error('Lead not found')
    }

    // Generate next payment number using inline logic (uses admin client to see deleted payments)
    console.log('🔵 [RECORD PAYMENT] Generating payment number for company:', data.companyId)
    const paymentNumber = await getNextPaymentNumberAction(data.companyId)
    console.log('🔵 [RECORD PAYMENT] Got payment number:', paymentNumber)
    if (!paymentNumber) {
      throw new Error('Failed to generate payment number')
    }

    // Record payment in database using admin client
    console.log('🔵 [RECORD PAYMENT] Inserting payment with number:', paymentNumber)
    const { error: paymentError } = await adminSupabase
      .from('payments')
      .insert({
        company_id: data.companyId,
        lead_id: data.leadId,
        invoice_id: data.invoiceId,
        payment_number: paymentNumber,
        amount: data.amount,
        payment_method: data.paymentMethod,
        payment_date: data.paymentDate,
        notes: data.notes,
        created_by: data.createdBy,
      })
    console.log('🔵 [RECORD PAYMENT] Insert result - Error:', paymentError)

    if (paymentError) {
      console.error('Payment recording error:', paymentError)
      throw new Error(`Failed to record payment: ${paymentError.message}`)
    }

    // Gather team members to notify
    const userIdsToNotify = new Set<string>()
    if (lead.sales_rep_id) userIdsToNotify.add(lead.sales_rep_id)
    if (lead.marketing_rep_id) userIdsToNotify.add(lead.marketing_rep_id)
    if (lead.sales_manager_id) userIdsToNotify.add(lead.sales_manager_id)
    if (lead.production_manager_id) userIdsToNotify.add(lead.production_manager_id)
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
    const adminSupabase = createAdminClient()
    
    // Get lead and invoice details (use admin client to bypass RLS in server action)
    const { data: lead, error: leadError } = await adminSupabase
      .from('leads')
      .select('id, full_name, created_by, sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id')
      .eq('id', data.leadId)
      .eq('company_id', data.companyId)
      .is('deleted_at', null)
      .single()

    if (leadError) {
      console.error('Error fetching lead:', leadError)
      throw new Error(`Lead query failed: ${leadError.message}`)
    }

    if (!lead) {
      console.error('Lead not found for ID:', data.leadId, 'Company:', data.companyId)
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
    if (lead.sales_rep_id) userIdsToNotify.add(lead.sales_rep_id)
    if (lead.marketing_rep_id) userIdsToNotify.add(lead.marketing_rep_id)
    if (lead.sales_manager_id) userIdsToNotify.add(lead.sales_manager_id)
    if (lead.production_manager_id) userIdsToNotify.add(lead.production_manager_id)
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
