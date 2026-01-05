// Check commission eligibility trigger
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCommissionTriggers() {
  const leadId = 'd6630561-41ef-466d-8e3a-73976c25ab02' // Your test lead ID
  
  console.log('\n=== Commission Trigger Debugging ===\n')
  
  // 1. Check all commissions for this lead
  console.log('--- Commissions ---')
  const { data: commissions, error: commError } = await supabase
    .from('lead_commissions')
    .select('id, user_id, status, paid_when, calculated_amount, triggered_by_payment_id, users!lead_commissions_user_id_fkey(full_name)')
    .eq('lead_id', leadId)
    .is('deleted_at', null)
  
  if (commError) {
    console.error('Error fetching commissions:', commError)
    return
  }
  
  console.log('Found', commissions?.length || 0, 'commissions:')
  commissions?.forEach(c => {
    console.log(`  - ${c.users?.full_name}: status=${c.status}, paid_when=${c.paid_when}, amount=$${c.calculated_amount}, trigger_payment=${c.triggered_by_payment_id || 'none'}`)
  })
  
  // 2. Check all payments for this lead
  console.log('\n--- Payments ---')
  const { data: payments, error: payError } = await supabase
    .from('payments')
    .select('id, payment_number, amount, payment_method, payment_date, cleared_at, deleted_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  
  if (payError) {
    console.error('Error fetching payments:', payError)
    return
  }
  
  console.log('Found', payments?.length || 0, 'payments:')
  payments?.forEach(p => {
    console.log(`  - ${p.payment_number}: $${p.amount} via ${p.payment_method}, cleared=${p.cleared_at ? 'YES' : 'NO'}, deleted=${p.deleted_at ? 'YES' : 'NO'}`)
  })
  
  // 3. Check invoice and contract totals
  console.log('\n--- Invoice & Contract ---')
  const { data: invoice, error: invError } = await supabase
    .from('customer_invoices')
    .select('invoice_total, amount_paid, balance_due, contract_price')
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .single()
  
  if (invError) {
    console.error('Error fetching invoice:', invError)
  } else if (invoice) {
    console.log('Invoice Total:', invoice.invoice_total)
    console.log('Amount Paid:', invoice.amount_paid)
    console.log('Balance Due:', invoice.balance_due)
    console.log('Contract Price:', invoice.contract_price)
    console.log('Balance is Zero?', invoice.balance_due === 0)
  }
  
  // 4. Manually test eligibility logic for each commission
  console.log('\n--- Manual Eligibility Check ---')
  
  const hasDepositPayment = payments?.some(p => !p.deleted_at && p.cleared_at)
  const hasFinalPayment = invoice?.balance_due === 0
  
  console.log('Has any cleared payment?', hasDepositPayment)
  console.log('Has final payment (balance zero)?', hasFinalPayment)
  
  if (commissions) {
    for (const comm of commissions) {
      console.log(`\n${comm.users?.full_name} (${comm.paid_when}):`)
      
      let shouldBeEligible = false
      
      switch(comm.paid_when) {
        case 'when_deposit_paid':
          shouldBeEligible = hasDepositPayment
          console.log('  Checking deposit paid:', hasDepositPayment ? 'YES - should be ELIGIBLE' : 'NO - should be PENDING')
          break
        case 'when_final_payment':
          shouldBeEligible = hasFinalPayment
          console.log('  Checking final payment:', hasFinalPayment ? 'YES - should be ELIGIBLE' : 'NO - should be PENDING')
          break
        default:
          console.log('  Unknown trigger condition')
      }
      
      console.log('  Current status:', comm.status)
      console.log('  Should be:', shouldBeEligible ? 'eligible' : 'pending')
      
      if (shouldBeEligible && comm.status !== 'eligible') {
        console.log('  ⚠️  PROBLEM: Should be eligible but is', comm.status)
      }
    }
  }
}

checkCommissionTriggers().catch(console.error)
