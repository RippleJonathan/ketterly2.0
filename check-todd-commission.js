// Check Todd Night's commission data
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkToddCommission() {
  console.log('🔍 Checking Todd Night commission data...\n')
  
  // Get Todd's user ID
  const { data: todd } = await supabase
    .from('users')
    .select('id, full_name, email')
    .ilike('full_name', '%todd%')
    .single()
  
  if (!todd) {
    console.log('❌ Todd not found')
    return
  }
  
  console.log(`👤 Found user: ${todd.full_name} (${todd.email})`)
  console.log(`   User ID: ${todd.id}\n`)
  
  // Get Todd's commissions
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select(`
      *,
      leads!inner(full_name, address),
      commission_plans(name)
    `)
    .eq('user_id', todd.id)
    .is('deleted_at', null)
  
  console.log(`💼 Found ${commissions?.length || 0} commission(s):\n`)
  
  commissions?.forEach((comm, index) => {
    console.log(`${index + 1}. Lead: ${comm.leads.full_name}`)
    console.log(`   Commission Plan: ${comm.commission_plans?.name || 'None'}`)
    console.log(`   Type: ${comm.commission_type}`)
    console.log(`   Rate: ${comm.commission_rate || 'N/A'}`)
    console.log(`   Flat Amount: $${comm.flat_amount || 0}`)
    console.log(`   Base Amount: $${comm.base_amount || 0}`)
    console.log(`   Calculated Amount: $${comm.calculated_amount || 0}`)
    console.log(`   Balance Owed: $${comm.balance_owed || 0}`)
    console.log(`   Paid Amount: $${comm.paid_amount || 0}`)
    console.log(`   Status: ${comm.status}`)
    console.log(`   Paid When: ${comm.paid_when}`)
    console.log()
  })
}

checkToddCommission().catch(console.error)
