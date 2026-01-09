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
    // Get all active commissions for this lead
    const { data: commissions, error: fetchError } = await supabase
      .from('lead_commissions')
      .select(`
        id,
        user_id,
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

        // Determine commission type and amount
        // Prefer plan values over commission record values (plan is source of truth)
        // BUT only if plan exists (office commissions don't have plans)
        const plan = comm.commission_plans
        const commType = plan ? plan.commission_type : comm.commission_type
        const commRate = plan && plan.commission_rate !== null ? plan.commission_rate : comm.commission_rate
        const flatAmt = plan && plan.flat_amount !== null ? plan.flat_amount : comm.flat_amount

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
          newBaseAmount !== 0 // Always update base_amount if we have a new value
        ) {
          const { error: updateError } = await updateLeadCommission(comm.id, companyId, {
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
