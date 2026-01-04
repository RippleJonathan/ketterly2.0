// Check location_users table data
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkLocationUsers() {
  console.log('Checking location_users table...\n')
  
  // 1. Check all location_users records
  const { data: allLocationUsers, error: allError } = await supabase
    .from('location_users')
    .select('*')
  
  console.log('All location_users records:')
  console.log(JSON.stringify(allLocationUsers, null, 2))
  if (allError) console.error('Error:', allError)
  
  console.log('\n---\n')
  
  // 2. Check location_users with user details
  const { data: withUsers, error: usersError } = await supabase
    .from('location_users')
    .select(`
      user_id,
      location_id,
      users!inner(id, full_name, email, role)
    `)
  
  console.log('Location users with details:')
  console.log(JSON.stringify(withUsers, null, 2))
  if (usersError) console.error('Error:', usersError)
  
  console.log('\n---\n')
  
  // 3. Check all users table
  const { data: allUsers, error: allUsersError } = await supabase
    .from('users')
    .select('id, full_name, email, role, location_id, company_id')
  
  console.log('All users:')
  console.log(JSON.stringify(allUsers, null, 2))
  if (allUsersError) console.error('Error:', allUsersError)
  
  console.log('\n---\n')
  
  // 4. Check all locations
  const { data: allLocations, error: locationsError } = await supabase
    .from('locations')
    .select('id, name, company_id')
  
  console.log('All locations:')
  console.log(JSON.stringify(allLocations, null, 2))
  if (locationsError) console.error('Error:', locationsError)
}

checkLocationUsers()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
