// lib/utils/recalculate-commissions.ts
import { createClient } from '@/lib/supabase/client'
import { updateLeadCommission } from '@/lib/api/lead-commissions'

export interface RecalculateResult {
  success: boolean
  updated: number
  errors: string[]
}

/**
 * Recalculate commission amounts based on current invoice/financial data
 * Updates existing commissions with correct calculated_amount and balance_owed
 */
export async function recalculateLeadCommissions(
  leadId: string,
  companyId: string
): Promise<RecalculateResult> {
  const supabase = createClient()
  const errors: string[] = []
  let updated = 0

  try {
    // Get all active commissions for this lead with assignment field
    const { data: commissions, error: fetchError } = await supabase
      .from('lead_commissions')
      .select(`
        id,
        user_id,
        assignment_field,
        commission_plan_id,
        commission_type,
        commission_rate,
        flat_amount,
        calculated_amount,
        paid_amount,
        commission_plans(
          id,
          commission_type,
          commission_rate,
          flat_amount,
          calculate_on
        )
      `)
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .in('status', ['pending', 'eligible', 'approved'])
      .is('deleted_at', null)

    if (fetchError) throw fetchError
    if (!commissions || commissions.length === 0) {
      return { success: true, updated: 0, errors: [] }
    }

    // Get invoice total for this lead
    const { data: invoice } = await supabase
      .from('customer_invoices')
      .select('total')
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const invoiceTotal = invoice ? Number(invoice.total) || 0 : 0

    console.log(`📊 Recalculating ${commissions.length} commission(s) with invoice total: $${invoiceTotal}`)

    // Recalculate each commission
    for (const comm of commissions) {
      try {
        let newCalculatedAmount = 0
        let newBaseAmount = 0
        let updatedCommType = comm.commission_type
        let updatedCommRate = comm.commission_rate
        let updatedFlatAmt = comm.flat_amount

        // Get user's current role-based commission settings if assignment_field exists
        if (comm.assignment_field && comm.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select(`
              sales_commission_type,
              sales_commission_rate,
              sales_flat_amount,
              marketing_commission_type,
              marketing_commission_rate,
              marketing_flat_amount,
              production_commission_type,
              production_commission_rate,
              production_flat_amount
            `)
            .eq('id', comm.user_id)
            .single()

          if (userData) {
            // Map assignment_field to correct commission fields
            const rolePrefix = comm.assignment_field.replace('_id', '') // 'sales_rep' | 'marketing_rep' | etc.
            
            if (rolePrefix === 'sales_rep' || rolePrefix === 'sales_manager') {
              updatedCommType = userData.sales_commission_type || comm.commission_type
              updatedCommRate = userData.sales_commission_rate || comm.commission_rate
              updatedFlatAmt = userData.sales_flat_amount || comm.flat_amount
            } else if (rolePrefix === 'marketing_rep') {
              updatedCommType = userData.marketing_commission_type || comm.commission_type
              updatedCommRate = userData.marketing_commission_rate || comm.commission_rate
              updatedFlatAmt = userData.marketing_flat_amount || comm.flat_amount
            } else if (rolePrefix === 'production_manager') {
              updatedCommType = userData.production_commission_type || comm.commission_type
              updatedCommRate = userData.production_commission_rate || comm.commission_rate
              updatedFlatAmt = userData.production_flat_amount || comm.flat_amount
            }
            
            console.log(`   🔄 Updated ${rolePrefix} rate from stored ${comm.commission_rate}% to current ${updatedCommRate}%`)
          }
        }

        // Determine commission type and amount
        // Use updated values from user's current settings
        const commType = updatedCommType
        const commRate = updatedCommRate
        const flatAmt = updatedFlatAmt

        if (commType === 'flat_amount') {
          // Flat commission - use flat_amount directly
          newCalculatedAmount = Number(flatAmt) || 0
          newBaseAmount = newCalculatedAmount
          console.log(`   💰 Flat: $${newCalculatedAmount}`)
        } else if (commType === 'percentage') {
          // Percentage commission - calculate from invoice total
          newBaseAmount = invoiceTotal
          const rate = Number(commRate) || 0
          newCalculatedAmount = invoiceTotal * (rate / 100)
          console.log(`   💰 Percentage: ${rate}% of $${invoiceTotal} = $${newCalculatedAmount}`)
        } else {
          console.log(`   ⚠️  Unknown commission type: ${commType}`)
          errors.push(`Commission ${comm.id}: Unknown type ${commType}`)
          continue
        }

        // Calculate new balance
        const paidAmount = Number(comm.paid_amount) || 0
        const newBalanceOwed = newCalculatedAmount - paidAmount

        // Only update if values changed
        if (
          newCalculatedAmount !== comm.calculated_amount ||
          newBaseAmount !== 0 || // Always update base_amount if we have a new value
          updatedCommType !== comm.commission_type ||
          updatedCommRate !== comm.commission_rate ||
          updatedFlatAmt !== comm.flat_amount
        ) {
          const { error: updateError } = await updateLeadCommission(comm.id, companyId, {
            commission_type: updatedCommType,
            commission_rate: updatedCommRate,
            flat_amount: updatedFlatAmt,
            calculated_amount: newCalculatedAmount,
            base_amount: newBaseAmount,
            balance_owed: newBalanceOwed,
          })

          if (updateError) {
            errors.push(`Commission ${comm.id}: ${updateError.message}`)
          } else {
            updated++
            console.log(`   ✅ Updated commission ${comm.id.slice(0, 8)}`)
          }
        } else {
          console.log(`   ℹ️  No changes needed for commission ${comm.id.slice(0, 8)}`)
        }
      } catch (err) {
        const error = err as Error
        errors.push(`Commission ${comm.id}: ${error.message}`)
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors,
    }
  } catch (error) {
    const err = error as Error
    return {
      success: false,
      updated,
      errors: [err.message],
    }
  }
}
