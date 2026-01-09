// Lead Closure Validation
// Checks if a lead meets all requirements to be closed

import { createClient } from '@/lib/supabase/client'

export interface ClosureRequirements {
  canClose: boolean
  checks: {
    invoicesPaid: boolean
    commissionsSettled: boolean
    changeOrdersComplete: boolean
    productionComplete: boolean
  }
  pendingItems: string[]
}

/**
 * Check if a lead meets all requirements to be closed
 * 
 * Requirements:
 * 1. All invoices fully paid
 * 2. All commissions approved or paid
 * 3. All change orders complete
 * 4. Production status = completed or invoiced
 * 
 * @param leadId - The lead ID to check
 * @param companyId - The company ID
 * @returns ClosureRequirements object with validation results
 */
export async function checkClosureRequirements(
  leadId: string,
  companyId: string
): Promise<ClosureRequirements> {
  const supabase = createClient()
  
  const checks = {
    invoicesPaid: false,
    commissionsSettled: false,
    changeOrdersComplete: false,
    productionComplete: false,
  }
  
  const pendingItems: string[] = []
  
  // 1. Check invoices - ALL must be paid
  const { data: invoices } = await supabase
    .from('customer_invoices')
    .select('status, total, amount_paid')
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
  
  if (invoices && invoices.length > 0) {
    checks.invoicesPaid = invoices.every(inv => 
      inv.status === 'paid' && Number(inv.amount_paid) >= Number(inv.total)
    )
  } else {
    // No invoices = can't close yet
    checks.invoicesPaid = false
  }
  
  if (!checks.invoicesPaid) {
    pendingItems.push('Unpaid or partial invoices')
  }
  
  // 2. Check commissions - ALL must be approved or paid
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select('status')
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
  
  if (commissions && commissions.length > 0) {
    checks.commissionsSettled = commissions.every(comm => 
      comm.status === 'paid' || comm.status === 'approved'
    )
  } else {
    // No commissions = OK (not all jobs have commissions)
    checks.commissionsSettled = true
  }
  
  if (!checks.commissionsSettled) {
    pendingItems.push('Pending commissions (not approved/paid)')
  }
  
  // 3. Check change orders - ALL must be approved or completed
  const { data: changeOrders } = await supabase
    .from('change_orders')
    .select('status')
    .eq('lead_id', leadId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
  
  if (changeOrders && changeOrders.length > 0) {
    checks.changeOrdersComplete = changeOrders.every(co => 
      co.status === 'approved' || co.status === 'completed'
    )
  } else {
    // No change orders = OK
    checks.changeOrdersComplete = true
  }
  
  if (!checks.changeOrdersComplete) {
    pendingItems.push('Unapproved change orders')
  }
  
  // 4. Check production status - must be completed or in invoiced stage
  const { data: lead } = await supabase
    .from('leads')
    .select('status, sub_status')
    .eq('id', leadId)
    .single()
  
  if (lead) {
    checks.productionComplete = 
      lead.status === 'invoiced' || 
      (lead.status === 'production' && lead.sub_status === 'completed')
  } else {
    checks.productionComplete = false
  }
  
  if (!checks.productionComplete) {
    pendingItems.push('Production not marked as completed')
  }
  
  // Can close only if ALL required checks pass
  const canClose = 
    checks.invoicesPaid &&
    checks.commissionsSettled &&
    checks.changeOrdersComplete &&
    checks.productionComplete
  
  return {
    canClose,
    checks,
    pendingItems,
  }
}
