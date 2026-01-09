// Check Todd's commission in detail
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkToddDetailed() {
  const leadId = '81be9e45-dbfc-452d-87c8-847213edc0fc'
  
  console.log('🔍 Checking Todd commission details...\n')
  
  // Get Todd's user ID
  const { data: todd } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'todd@rippleroofs.com')
    .single()
  
  if (!todd) {
    console.log('❌ Todd not found')
    return
  }
  
  // Get Todd's commission with plan details
  const { data: comm, error } = await supabase
    .from('lead_commissions')
    .select(`
      *,
      commission_plans(*)
    `)
    .eq('lead_id', leadId)
    .eq('user_id', todd.id)
    .is('deleted_at', null)
    .single()
  
  if (error) {
    console.log('❌ Error:', error.message)
    return
  }
  
  if (!comm) {
    console.log('❌ No commission found for Todd on this lead')
    return
  }
  
  console.log('📋 Commission Record:')
  console.log('   commission_plan_id:', comm.commission_plan_id)
  console.log('   commission_type:', comm.commission_type)
  console.log('   commission_rate:', comm.commission_rate)
  console.log('   flat_amount:', comm.flat_amount)
  console.log('   calculated_amount:', comm.calculated_amount)
  console.log('   base_amount:', comm.base_amount)
  console.log('   balance_owed:', comm.balance_owed)
  console.log('   paid_when:', comm.paid_when)
  console.log()
  
  if (comm.commission_plans) {
    console.log('📝 Commission Plan:')
    console.log('   name:', comm.commission_plans.name)
    console.log('   commission_type:', comm.commission_plans.commission_type)
    console.log('   commission_rate:', comm.commission_plans.commission_rate)
    console.log('   flat_amount:', comm.commission_plans.flat_amount)
    console.log('   paid_when:', comm.commission_plans.paid_when)
    console.log()
  }
  
  // Test the logic
  const plan = comm.commission_plans
  const commType = comm.commission_type || plan?.commission_type
  const commRate = comm.commission_rate !== null ? comm.commission_rate : plan?.commission_rate
  const flatAmt = comm.flat_amount !== null ? comm.flat_amount : plan?.flat_amount
  
  console.log('🧪 Calculation Logic:')
  console.log('   Determined type:', commType)
  console.log('   comm.commission_rate:', comm.commission_rate)
  console.log('   plan?.commission_rate:', plan?.commission_rate)
  console.log('   Final rate:', commRate)
  console.log('   comm.flat_amount:', comm.flat_amount)
  console.log('   plan?.flat_amount:', plan?.flat_amount)
  console.log('   Final flat_amount:', flatAmt)
  console.log()
  
  if (commType === 'flat_amount') {
    console.log('✅ Type is flat_amount')
    console.log(`   Should calculate as: $${flatAmt}`)
  } else {
    console.log('❌ Type is NOT flat_amount:', commType)
  }
}

checkToddDetailed().catch(console.error)
