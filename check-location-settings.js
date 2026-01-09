// Check location settings
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkLocationSettings() {
  console.log('🔍 Checking Location Settings...\n')
  
  // Get all locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .order('created_at', { ascending: false })
  
  if (!locations || locations.length === 0) {
    console.log('❌ No locations found')
    return
  }
  
  for (const location of locations) {
    console.log(`\n📍 Location: ${location.name} (ID: ${location.id})`)
    
    // Get ALL users at this location (not just commission_enabled=true)
    const { data: locationUsers } = await supabase
      .from('location_users')
      .select(`
        user_id,
        commission_enabled,
        commission_type,
        commission_rate,
        flat_commission_amount,
        users!inner(id, full_name, email, role)
      `)
      .eq('location_id', location.id)
    
    if (!locationUsers || locationUsers.length === 0) {
      console.log('   ⚠️  No users assigned to this location')
      continue
    }
    
    console.log(`\n   👥 Users (${locationUsers.length}):`)
    locationUsers.forEach(lu => {
      console.log(`\n   - ${lu.users.full_name} (${lu.users.email})`)
      console.log(`     Role: ${lu.users.role}`)
      console.log(`     Commission Enabled: ${lu.commission_enabled ? '✅ YES' : '❌ NO'}`)
      if (lu.commission_enabled) {
        console.log(`     Type: ${lu.commission_type}`)
        console.log(`     Rate: ${lu.commission_rate}%`)
        console.log(`     Flat: $${lu.flat_commission_amount || 0}`)
      }
    })
  }
  
  console.log('\n✅ Check complete!')
}

checkLocationSettings()
  .catch(console.error)
