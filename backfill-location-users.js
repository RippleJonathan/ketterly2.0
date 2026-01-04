// Backfill location_users table from users.default_location_id
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function backfillLocationUsers() {
  console.log('Backfilling location_users table...\n')
  
  // 1. Get all users with a default_location_id
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email, default_location_id')
    .not('default_location_id', 'is', null)
  
  if (usersError) {
    console.error('Error fetching users:', usersError)
    return
  }
  
  console.log(`Found ${users.length} users with default_location_id\n`)
  
  // 2. For each user, insert into location_users (if not already there)
  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  
  for (const user of users) {
    console.log(`Processing ${user.full_name} (${user.email})...`)
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('location_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('location_id', user.default_location_id)
      .single()
    
    if (existing) {
      console.log(`  ✓ Already in location_users\n`)
      skipCount++
      continue
    }
    
    // Insert
    const { error: insertError } = await supabase
      .from('location_users')
      .insert({
        user_id: user.id,
        location_id: user.default_location_id,
        assigned_by: user.id, // Self-assign for backfill
      })
    
    if (insertError) {
      console.error(`  ✗ Error:`, insertError.message, '\n')
      errorCount++
    } else {
      console.log(`  ✓ Added to location_users\n`)
      successCount++
    }
  }
  
  console.log('\n---')
  console.log('Summary:')
  console.log(`  Added: ${successCount}`)
  console.log(`  Skipped: ${skipCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log('---\n')
  
  // 3. Verify results
  const { data: allLocationUsers } = await supabase
    .from('location_users')
    .select('*')
  
  console.log(`Total records in location_users: ${allLocationUsers?.length || 0}`)
}

backfillLocationUsers()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
