// Check office manager commission setup
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOfficeCommission() {
  console.log('🔍 Checking Office Manager Commission Setup...\n')
  
  // Get the most recent lead
  const { data: lead } = await supabase
    .from('leads')
    .select('id, full_name, location_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (!lead) {
    console.log('❌ No leads found')
    return
  }
  
  console.log('📋 Lead:', lead.full_name, `(ID: ${lead.id})`)
  console.log('   Location ID:', lead.location_id || 'None')
  
  if (!lead.location_id) {
    console.log('⚠️  Lead has no location assigned\n')
    return
  }
  
  // Check location users with commissions enabled
  console.log('\n👥 Location Users with Commissions Enabled:')
  const { data: locationUsers } = await supabase
    .from('location_users')
    .select(`
      user_id,
      commission_enabled,
      commission_type,
      commission_rate,
      flat_commission_amount,
      users!inner(id, full_name, email)
    `)
    .eq('location_id', lead.location_id)
    .eq('commission_enabled', true)
  
  if (!locationUsers || locationUsers.length === 0) {
    console.log('   ❌ No users with commission enabled at this location\n')
    return
  }
  
  console.log(`   Found ${locationUsers.length} user(s):`)
  locationUsers.forEach(lu => {
    console.log(`   - ${lu.users.full_name} (${lu.users.email})`)
    console.log(`     Type: ${lu.commission_type}`)
    console.log(`     Rate: ${lu.commission_rate}%`)
    console.log(`     Flat Amount: $${lu.flat_commission_amount || 0}`)
  })
  
  // Check existing commissions for this lead
  console.log('\n💰 Existing Commissions for this Lead:')
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select(`
      id,
      user_id,
      commission_type,
      commission_rate,
      flat_amount,
      calculated_amount,
      base_amount,
      status,
      notes,
      users!inner(full_name, email)
    `)
    .eq('lead_id', lead.id)
    .is('deleted_at', null)
  
  if (!commissions || commissions.length === 0) {
    console.log('   ❌ No commissions found for this lead\n')
    return
  }
  
  console.log(`   Found ${commissions.length} commission(s):`)
  commissions.forEach(comm => {
    console.log(`   - ${comm.users.full_name} (${comm.users.email})`)
    console.log(`     Type: ${comm.commission_type}`)
    console.log(`     Rate: ${comm.commission_rate}% | Flat: $${comm.flat_amount || 0}`)
    console.log(`     Base: $${comm.base_amount} | Calculated: $${comm.calculated_amount}`)
    console.log(`     Status: ${comm.status}`)
    console.log(`     Notes: ${comm.notes || 'None'}`)
  })
  
  // Check if invoice exists
  console.log('\n📄 Invoice Check:')
  const { data: invoice } = await supabase
    .from('customer_invoices')
    .select('id, total, status')
    .eq('lead_id', lead.id)
    .is('deleted_at', null)
    .maybeSingle()
  
  if (invoice) {
    console.log(`   ✅ Invoice found: $${invoice.total} (Status: ${invoice.status})`)
  } else {
    console.log('   ⚠️  No invoice found yet')
  }
  
  console.log('\n✅ Check complete!')
}

checkOfficeCommission()
  .catch(console.error)
