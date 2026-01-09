// Test the recalculation logic
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRecalculation() {
  const leadId = '81be9e45-dbfc-452d-87c8-847213edc0fc' // Jonathan Ketterman lead
  const companyId = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34'
  
  console.log('🧪 Testing commission recalculation...\n')
  
  // Get invoice total
  const { data: invoice } = await supabase
    .from('customer_invoices')
    .select('total')
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  const invoiceTotal = invoice ? Number(invoice.total) || 0 : 0
  console.log(`💰 Invoice Total: $${invoiceTotal}`)
  
  // Get all commissions
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select(`
      id,
      user_id,
      users!lead_commissions_user_id_fkey(full_name),
      commission_type,
      commission_rate,
      flat_amount,
      calculated_amount,
      balance_owed,
      commission_plans(commission_type, commission_rate, flat_amount)
    `)
    .eq('lead_id', leadId)
    .is('deleted_at', null)
  
  console.log(`\n📋 Current Commissions (${commissions?.length || 0}):\n`)
  
  commissions?.forEach((comm, idx) => {
    const plan = comm.commission_plans
    const commType = comm.commission_type || plan?.commission_type
    const commRate = comm.commission_rate !== null ? comm.commission_rate : plan?.commission_rate
    const flatAmt = comm.flat_amount !== null ? comm.flat_amount : plan?.flat_amount
    
    console.log(`${idx + 1}. ${comm.users?.full_name}`)
    console.log(`   Type: ${commType}`)
    console.log(`   Rate/Amount: ${commType === 'percentage' ? `${commRate}%` : `$${flatAmt}`}`)
    console.log(`   Current Calculated: $${comm.calculated_amount}`)
    
    // Calculate what it SHOULD be
    let shouldBe = 0
    if (commType === 'flat_amount') {
      shouldBe = Number(flatAmt) || 0
    } else if (commType === 'percentage') {
      shouldBe = invoiceTotal * ((Number(commRate) || 0) / 100)
    }
    
    console.log(`   Should Be: $${shouldBe.toFixed(2)}`)
    console.log(`   ${shouldBe === Number(comm.calculated_amount) ? '✅ Correct' : '❌ NEEDS UPDATE'}`)
    console.log()
  })
}

testRecalculation().catch(console.error)
