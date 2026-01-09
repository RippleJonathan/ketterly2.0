// Test Team Lead commission creation
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testTeamLeadSetup() {
  console.log('🧪 Testing Team Lead Commission Setup\n')
  
  // 1. Set Billy Idol as Team Lead at Arizona Office with 2% commission
  console.log('Step 1: Setting Billy Idol as Team Lead at Arizona Office...')
  
  // Get Billy's user ID
  const { data: billy } = await supabase
    .from('users')
    .select('id, full_name, role')
    .ilike('full_name', '%billy idol%')
    .single()
  
  if (!billy) {
    console.log('❌ Billy Idol not found')
    return
  }
  
  console.log(`   Found: ${billy.full_name} (${billy.role})`)
  
  // Get Arizona Office location ID
  const { data: arizonaOffice } = await supabase
    .from('locations')
    .select('id, name')
    .ilike('name', '%arizona%')
    .single()
  
  if (!arizonaOffice) {
    console.log('❌ Arizona Office not found')
    return
  }
  
  console.log(`   Location: ${arizonaOffice.name}`)
  
  // Update Billy's location_users record
  const { data: updated, error } = await supabase
    .from('location_users')
    .update({
      team_lead_for_location: true,
      commission_enabled: true,
      commission_type: 'percentage',
      commission_rate: 2.0,
      flat_commission_amount: null,
      paid_when: 'when_final_payment',
      include_own_sales: false, // Don't include his own sales
    })
    .eq('location_id', arizonaOffice.id)
    .eq('user_id', billy.id)
    .select()
  
  if (error) {
    console.log('❌ Error updating:', error.message)
    return
  }
  
  console.log('✅ Billy Idol set as Team Lead with 2% commission\n')
  
  // 2. Verify the setup
  console.log('Step 2: Verifying setup...')
  
  const { data: verification } = await supabase
    .from('location_users')
    .select(`
      *,
      users!location_users_user_id_fkey(full_name, role),
      locations(name)
    `)
    .eq('location_id', arizonaOffice.id)
    .eq('commission_enabled', true)
  
  console.log(`\n📋 Commission-enabled users at ${arizonaOffice.name}:\n`)
  verification?.forEach((lu, idx) => {
    console.log(`${idx + 1}. ${lu.users.full_name} (${lu.users.role})`)
    console.log(`   Team Lead: ${lu.team_lead_for_location ? 'YES ⭐' : 'No'}`)
    console.log(`   Commission: ${lu.commission_type === 'percentage' ? `${lu.commission_rate}%` : `$${lu.flat_commission_amount}`}`)
    console.log(`   Paid When: ${lu.paid_when}`)
    console.log(`   Include Own Sales: ${lu.include_own_sales ? 'Yes' : 'No'}`)
    console.log()
  })
}

testTeamLeadSetup().catch(console.error)
