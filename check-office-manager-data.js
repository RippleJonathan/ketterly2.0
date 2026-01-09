// Check actual office manager data in database
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOfficeManagerData() {
  console.log('🔍 Checking Office Manager Database Records...\n')
  
  // Get all location_users records
  const { data: locationUsers, error } = await supabase
    .from('location_users')
    .select(`
      *,
      users!location_users_user_id_fkey(id, full_name, email, role),
      locations!inner(id, name)
    `)
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  if (!locationUsers || locationUsers.length === 0) {
    console.log('❌ No location_users records found at all!\n')
    return
  }
  
  console.log(`📋 Found ${locationUsers.length} location_users record(s):\n`)
  
  locationUsers.forEach((lu, index) => {
    console.log(`${index + 1}. ${lu.users.full_name} (${lu.users.email})`)
    console.log(`   Location: ${lu.locations.name}`)
    console.log(`   Role: ${lu.users.role}`)
    console.log(`   Commission Enabled: ${lu.commission_enabled}`)
    console.log(`   Commission Type: ${lu.commission_type}`)
    console.log(`   Commission Rate: ${lu.commission_rate}%`)
    console.log(`   Flat Amount: $${lu.flat_commission_amount || 0}`)
    console.log('')
  })
  
  console.log('✅ Check complete!')
}

checkOfficeManagerData()
  .catch(console.error)
