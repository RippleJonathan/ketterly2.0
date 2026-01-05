'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
// TODO: Create @/lib/notifications/email module
// import { sendNotificationEmail } from '@/lib/notifications/email'
import { sendPushNotification } from '@/lib/api/onesignal'

/**
 * Approve a single commission for payment
 * Requires can_approve_commissions permission
 */
export async function approveCommission(commissionId: string) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Check permission
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_approve_commissions')
      .eq('user_id', user.id)
      .single()
    
    if (!permissions?.can_approve_commissions) {
      return { success: false, error: 'Permission denied: cannot approve commissions' }
    }
    
    // Get commission details
    const { data: commission } = await supabase
      .from('lead_commissions')
      .select(`
        *,
        user:users!lead_commissions_user_id_fkey(id, full_name, email),
        lead:leads(id, full_name)
      `)
      .eq('id', commissionId)
      .single()
    
    if (!commission) {
      return { success: false, error: 'Commission not found' }
    }
    
    // Only approve eligible commissions
    if (commission.status !== 'eligible') {
      return { success: false, error: `Cannot approve commission with status: ${commission.status}` }
    }
    
    // Update commission status
    const { error: updateError } = await adminSupabase
      .from('lead_commissions')
      .update({
        status: 'approved',
        approved_by_user_id: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commissionId)
    
    if (updateError) {
      console.error('Failed to approve commission:', updateError)
      return { success: false, error: updateError.message }
    }
    
    // Get approver info
    const { data: approver } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    // Send notification to commission owner
    if (commission.user?.email) {
      // Check if email notifications enabled
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('email_notifications, commission_approved')
        .eq('user_id', commission.user.id)
        .single()
      
      // TODO: Implement sendNotificationEmail
      // if (prefs?.email_notifications && prefs?.commission_approved) {
      //   await sendNotificationEmail(commission.user.email, {
      //     subject: 'Commission Approved',
      //     template: 'commission-approved',
      //     data: {
      //       user_name: commission.user.full_name,
      //       lead_name: commission.lead?.full_name || 'Unknown',
      //       amount: commission.calculated_amount,
      //       approver_name: approver?.full_name || 'Admin',
      //       link: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${commission.lead_id}?tab=commissions`
      //     }
      //   })
      // }
      
      // Send push notification
      const { data: pushPrefs } = await supabase
        .from('user_preferences')
        .select('push_notifications, commission_approved')
        .eq('user_id', commission.user.id)
        .single()
      
      if (pushPrefs?.push_notifications && pushPrefs?.commission_approved) {
        await sendPushNotification({
          userIds: [commission.user.id],
          title: 'Commission Approved',
          message: `Your commission for ${commission.lead?.full_name || 'a job'} has been approved ($${commission.calculated_amount.toFixed(2)})`,
          url: `/admin/leads/${commission.lead_id}?tab=commissions`
        })
      }
    }
    
    // Revalidate caches
    revalidatePath(`/admin/leads/${commission.lead_id}`)
    revalidatePath('/admin/commissions')
    
    return { success: true, data: { commissionId } }
  } catch (error: any) {
    console.error('Error approving commission:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Approve multiple commissions in bulk
 * Requires can_approve_commissions permission
 */
export async function bulkApproveCommissions(commissionIds: string[]) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Check permission
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_approve_commissions')
      .eq('user_id', user.id)
      .single()
    
    if (!permissions?.can_approve_commissions) {
      return { success: false, error: 'Permission denied: cannot approve commissions' }
    }
    
    // Get commissions
    const { data: commissions } = await supabase
      .from('lead_commissions')
      .select(`
        *,
        user:users!lead_commissions_user_id_fkey(id, full_name, email),
        lead:leads(id, full_name)
      `)
      .in('id', commissionIds)
      .eq('status', 'eligible') // Only approve eligible ones
    
    if (!commissions || commissions.length === 0) {
      return { success: false, error: 'No eligible commissions found' }
    }
    
    // Update all commissions
    const { error: updateError } = await adminSupabase
      .from('lead_commissions')
      .update({
        status: 'approved',
        approved_by_user_id: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', commissions.map(c => c.id))
    
    if (updateError) {
      console.error('Failed to bulk approve commissions:', updateError)
      return { success: false, error: updateError.message }
    }
    
    // Get approver info
    const { data: approver } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    // Send notifications to each commission owner
    for (const commission of commissions) {
      if (commission.user?.email) {
        // Check email preferences
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('email_notifications, commission_approved')
          .eq('user_id', commission.user.id)
          .single()
        
        // TODO: Implement sendNotificationEmail
        // if (prefs?.email_notifications && prefs?.commission_approved) {
        //   await sendNotificationEmail(commission.user.email, {
        //     subject: 'Commission Approved',
        //     template: 'commission-approved',
        //     data: {
        //       user_name: commission.user.full_name,
        //       lead_name: commission.lead?.full_name || 'Unknown',
        //       amount: commission.calculated_amount,
        //       approver_name: approver?.full_name || 'Admin',
        //       link: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${commission.lead_id}?tab=commissions`
        //     }
        //   })
        // }
        
        // Send push notification
        const { data: pushPrefs } = await supabase
          .from('user_preferences')
          .select('push_notifications, commission_approved')
          .eq('user_id', commission.user.id)
          .single()
        
        if (pushPrefs?.push_notifications && pushPrefs?.commission_approved) {
          await sendPushNotification({
            userIds: [commission.user.id],
            title: 'Commission Approved',
            message: `Your commission for ${commission.lead?.full_name || 'a job'} has been approved ($${commission.calculated_amount.toFixed(2)})`,
            url: `/admin/leads/${commission.lead_id}?tab=commissions`
          })
        }
      }
    }
    
    // Revalidate caches
    for (const commission of commissions) {
      revalidatePath(`/admin/leads/${commission.lead_id}`)
    }
    revalidatePath('/admin/commissions')
    
    return { 
      success: true, 
      data: { 
        approvedCount: commissions.length,
        commissionIds: commissions.map(c => c.id)
      } 
    }
  } catch (error: any) {
    console.error('Error bulk approving commissions:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark a commission as paid
 * Requires can_approve_commissions permission
 */
export async function markCommissionPaid(
  commissionId: string,
  paidDate: string,
  paymentReference: string
) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Check permission
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_approve_commissions')
      .eq('user_id', user.id)
      .single()
    
    if (!permissions?.can_approve_commissions) {
      return { success: false, error: 'Permission denied: cannot mark commissions as paid' }
    }
    
    // Get commission details
    const { data: commission } = await supabase
      .from('lead_commissions')
      .select(`
        *,
        user:users!lead_commissions_user_id_fkey(id, full_name, email),
        lead:leads(id, full_name)
      `)
      .eq('id', commissionId)
      .single()
    
    if (!commission) {
      return { success: false, error: 'Commission not found' }
    }
    
    // Only mark approved commissions as paid
    if (commission.status !== 'approved') {
      return { success: false, error: `Cannot mark commission as paid with status: ${commission.status}` }
    }
    
    // Update commission
    const { error: updateError } = await adminSupabase
      .from('lead_commissions')
      .update({
        status: 'paid',
        paid_date: paidDate,
        payment_reference: paymentReference,
        paid_amount: commission.calculated_amount, // Mark full amount as paid
        updated_at: new Date().toISOString()
      })
      .eq('id', commissionId)
    
    if (updateError) {
      console.error('Failed to mark commission as paid:', updateError)
      return { success: false, error: updateError.message }
    }
    
    // Send notification to commission owner
    if (commission.user?.email) {
      // Check email preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('email_notifications, commission_paid')
        .eq('user_id', commission.user.id)
        .single()
      
      // TODO: Implement sendNotificationEmail
      // if (prefs?.email_notifications && prefs?.commission_paid) {
      //   await sendNotificationEmail(commission.user.email, {
      //     subject: 'Commission Payment Received',
      //     template: 'commission-paid',
      //     data: {
      //       user_name: commission.user.full_name,
      //       amount: commission.calculated_amount,
      //       payment_reference: paymentReference,
      //       link: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${commission.lead_id}?tab=commissions`
      //     }
      //   })
      // }
      
      // Send push notification
      const { data: pushPrefs } = await supabase
        .from('user_preferences')
        .select('push_notifications, commission_paid')
        .eq('user_id', commission.user.id)
        .single()
      
      if (pushPrefs?.push_notifications && pushPrefs?.commission_paid) {
        await sendPushNotification({
          userIds: [commission.user.id],
          title: 'Commission Paid',
          message: `Your commission has been paid: $${commission.calculated_amount.toFixed(2)} (Ref: ${paymentReference})`,
          url: `/admin/leads/${commission.lead_id}?tab=commissions`
        })
      }
    }
    
    // Revalidate caches
    revalidatePath(`/admin/leads/${commission.lead_id}`)
    revalidatePath('/admin/commissions')
    
    return { success: true, data: { commissionId } }
  } catch (error: any) {
    console.error('Error marking commission as paid:', error)
    return { success: false, error: error.message }
  }
}
