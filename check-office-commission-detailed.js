// Check office manager commission details
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOfficeCommission() {
  const leadId = '81be9e45-dbfc-452d-87c8-847213edc0fc'
  
  console.log('🔍 Checking office manager commission...\n')
  
  // Get Jonathan's user ID
  const { data: jonathan } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'jonketterman@gmail.com')
    .single()
  
  if (!jonathan) {
    console.log('❌ Jonathan not found')
    return
  }
  
  // Get office commission
  const { data: comm, error } = await supabase
    .from('lead_commissions')
    .select(`
      *,
      commission_plans(*)
    `)
    .eq('lead_id', leadId)
    .eq('user_id', jonathan.id)
    .is('deleted_at', null)
    .single()
  
  if (error) {
    console.log('❌ Error:', error.message)
    return
  }
  
  if (!comm) {
    console.log('❌ No commission found')
    return
  }
  
  console.log('📋 Commission Record:')
  console.log('   commission_plan_id:', comm.commission_plan_id)
  console.log('   commission_type:', comm.commission_type)
  console.log('   commission_rate:', comm.commission_rate)
  console.log('   flat_amount:', comm.flat_amount)
  console.log('   calculated_amount:', comm.calculated_amount)
  console.log('   base_amount:', comm.base_amount)
  console.log('   notes:', comm.notes)
  console.log()
  
  console.log('📝 Commission Plan:', comm.commission_plans ? 'EXISTS' : 'NULL (office commission)')
  if (comm.commission_plans) {
    console.log('   This should be NULL for office commissions!')
  }
  console.log()
  
  // Test the logic
  const plan = comm.commission_plans
  const commType = plan?.commission_type || comm.commission_type
  const commRate = plan?.commission_rate !== null ? plan?.commission_rate : comm.commission_rate
  
  console.log('🧪 Calculation Logic:')
  console.log('   plan:', plan)
  console.log('   plan?.commission_rate:', plan?.commission_rate)
  console.log('   plan?.commission_rate !== null:', plan?.commission_rate !== null)
  console.log('   Determined type:', commType)
  console.log('   Determined rate:', commRate)
  console.log()
  
  if (commType === 'percentage') {
    console.log('✅ Type is percentage')
    console.log(`   Should calculate as: ${commRate}% of invoice total`)
  }
}

checkOfficeCommission().catch(console.error)
