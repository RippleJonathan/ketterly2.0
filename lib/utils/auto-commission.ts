// Automatic Commission Calculation and Creation
import { createClient } from '@/lib/supabase/client'
import { createLeadCommission, updateLeadCommission } from '@/lib/api/lead-commissions'
import { CommissionType, CommissionPaidWhen } from '@/lib/types/commissions'

function mapPlanPaidWhenToLeadCommissionPaidWhen(
  planPaidWhen: string | null | undefined
): CommissionPaidWhen {
  switch (planPaidWhen) {
    case 'deposit':
      return 'when_deposit_paid'
    case 'completed':
      return 'when_job_completed'
    case 'collected':
      return 'when_final_payment'
    case 'signed':
      // No exact equivalent in lead_commissions; keep valid and conservative.
      return 'custom'
    default:
      return 'when_final_payment'
  }
}

/**
 * Automatically create or update commission for a lead when user is assigned
 * 
 * This function:
 * 1. Gets the assigned user's commission plan
 * 2. Finds the latest approved quote/invoice total as base amount
 * 3. Calculates commission based on plan
 * 4. Creates/updates commission record
 * 5. Handles reassignment by canceling old user's commission
 * 
 * @param leadId - The lead ID
 * @param userId - The newly assigned user ID (null if unassigning)
 * @param companyId - The company ID
 * @param currentUserId - The user making the change
 */
export async function autoCreateCommission(
  leadId: string,
  userId: string | null,
  companyId: string,
  currentUserId: string | null
): Promise<{ success: boolean; message?: string }> {
  const supabase = createClient()

  try {
    // If unassigning (userId is null), cancel existing pending commissions
    if (!userId) {
      const { data: existingCommissions } = await supabase
        .from('lead_commissions')
        .select('id, status')
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .in('status', ['pending', 'approved'])
        .is('deleted_at', null)

      if (existingCommissions && existingCommissions.length > 0) {
        for (const commission of existingCommissions) {
          await updateLeadCommission(commission.id, companyId, {
            status: 'cancelled',
            notes: 'Lead unassigned - commission cancelled',
          })
        }
      }

      return { success: true, message: 'Existing commissions cancelled' }
    }

    // Get the assigned user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, commission_plan_id')
      .eq('id', userId)
      .eq('company_id', companyId)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user:', userError)
      return { success: false, message: 'User not found' }
    }

    // If user has no commission plan, don't create commission
    if (!userData.commission_plan_id) {
      console.log('User has no commission plan, skipping commission creation')
      return { success: true, message: 'No commission plan assigned to user' }
    }

    // Get the commission plan (separate query avoids embed ambiguity)
    const { data: plan, error: planError } = await supabase
      .from('commission_plans')
      .select('id, name, commission_type, commission_rate, flat_amount, paid_when, calculate_on')
      .eq('id', userData.commission_plan_id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (planError || !plan) {
      console.error('Error fetching commission plan:', planError)
      return { success: false, message: 'Commission plan not found' }
    }

    // Get invoice total for this lead (includes quote + change orders automatically)
    // This is the single source of truth for commission calculations
    let baseAmount = 0
    
    const { data: invoice } = await supabase
      .from('customer_invoices')
      .select('total, subtotal, tax_amount, status')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const invoiceTotal = invoice ? Number(invoice.total) || 0 : 0

    // Calculate base amount based on commission plan's calculate_on setting
    if (plan.calculate_on === 'revenue') {
      // Use invoice total as revenue (includes quote + change orders)
      baseAmount = invoiceTotal
    } else if (plan.calculate_on === 'profit') {
      // Calculate profit (invoice revenue - costs)
      const revenue = invoiceTotal
      
      // Get material costs
      const { data: materialOrders } = await supabase
        .from('material_orders')
        .select('total_with_tax')
        .eq('lead_id', leadId)
        .eq('order_type', 'material')
        .is('deleted_at', null)
      
      const materialCosts = materialOrders?.reduce((sum, mo) => sum + (Number(mo.total_with_tax) || 0), 0) || 0
      
      // Get labor costs
      const { data: workOrders } = await supabase
        .from('material_orders')
        .select('total_estimated')
        .eq('lead_id', leadId)
        .eq('order_type', 'work')
        .is('deleted_at', null)
      
      const laborCosts = workOrders?.reduce((sum, wo) => sum + (Number(wo.total_estimated) || 0), 0) || 0
      
      baseAmount = revenue - (materialCosts + laborCosts)
    } else if (plan.calculate_on === 'collected') {
      // Use actual payments received
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, cleared')
        .eq('lead_id', leadId)
        .is('deleted_at', null)
      
      baseAmount = payments?.reduce((sum, pay) => pay.cleared ? sum + (Number(pay.amount) || 0) : sum, 0) || 0
    } else {
      // Default to revenue (invoice total)
      baseAmount = invoiceTotal
    }

    // If still no base amount, create with $0 (can be updated when invoice is created)
    if (baseAmount === 0) {
      console.log('No invoice or financial data found - commission will be created with $0 base')
    }

    // Calculate commission based on plan type
    let calculatedAmount = 0
    let commissionType: CommissionType = 'percentage'
    let commissionRate: number | null = null
    let flatAmount: number | null = null

    if (plan.commission_type === 'percentage') {
      commissionType = 'percentage'
      commissionRate = Number(plan.commission_rate) || 0
      calculatedAmount = baseAmount * ((commissionRate || 0) / 100)
    } else if (plan.commission_type === 'flat_per_job') {
      commissionType = 'flat_amount'
      flatAmount = Number(plan.flat_amount) || 0
      calculatedAmount = flatAmount || 0
    } else {
      // Default to percentage
      commissionType = 'percentage'
      commissionRate = Number(plan.commission_rate) || 0
      calculatedAmount = baseAmount * ((commissionRate || 0) / 100)
    }

    // Cancel any existing pending commissions for OTHER users
    const { data: existingCommissions } = await supabase
      .from('lead_commissions')
      .select('id, user_id, status')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (existingCommissions && existingCommissions.length > 0) {
      for (const commission of existingCommissions) {
        // Cancel commissions for other users
        if (commission.user_id !== userId && 
            (commission.status === 'pending' || commission.status === 'approved')) {
          await updateLeadCommission(commission.id, companyId, {
            status: 'cancelled',
            notes: 'Lead reassigned to different user',
          })
        }
      }
    }

    // Check if THIS user already has a commission for this lead
    const existingUserCommission = existingCommissions?.find(
      c => c.user_id === userId && c.status !== 'cancelled' && c.status !== 'paid'
    )

    if (existingUserCommission) {
      // Update existing commission with new calculated values
      const updateResult = await updateLeadCommission(existingUserCommission.id, companyId, {
        commission_plan_id: plan.id,
        commission_type: commissionType,
        commission_rate: commissionRate,
        flat_amount: flatAmount,
        calculated_amount: calculatedAmount,
        base_amount: baseAmount,
        paid_when: mapPlanPaidWhenToLeadCommissionPaidWhen(plan.paid_when),
        notes: `Auto-updated: Base $${baseAmount.toFixed(2)}, Commission: $${calculatedAmount.toFixed(2)} (${plan.name})`,
      })

      if (updateResult.error) {
        console.error('Error updating commission:', updateResult.error)
        return { success: false, message: 'Error updating commission' }
      }

      return { success: true, message: `Commission updated: $${calculatedAmount.toFixed(2)}` }
    }

    // Create new commission
    const commissionData = {
      lead_id: leadId,
      user_id: userId,
      commission_plan_id: plan.id,
      commission_type: commissionType,
      commission_rate: commissionRate,
      flat_amount: flatAmount,
      calculated_amount: calculatedAmount,
      base_amount: baseAmount,
      paid_when: mapPlanPaidWhenToLeadCommissionPaidWhen(plan.paid_when),
      notes: `Auto-created: Base $${baseAmount.toFixed(2)}, Commission: $${calculatedAmount.toFixed(2)} (${plan.name})`,
      ...(currentUserId && { created_by: currentUserId }),
    }

    const result = await createLeadCommission(leadId, companyId, commissionData)

    if (result.error) {
      console.error('Error creating commission:', result.error)
      return { success: false, message: result.error.message || 'Error creating commission' }
    }

    return { success: true, message: `Commission created: $${calculatedAmount.toFixed(2)}` }
  } catch (error) {
    console.error('Error in autoCreateCommission:', error)
    return { success: false, message: 'Unexpected error' }
  }
}
