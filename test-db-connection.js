require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Test 1: Read companies
  console.log('\n=== Test 1: Read companies ===')
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, contact_email')
    .limit(5)
  
  if (companiesError) {
    console.error('❌ Error reading companies:', companiesError.message)
  } else {
    console.log('✅ Companies found:', companies.length)
    companies.forEach(c => console.log(`  - ${c.name} (${c.contact_email})`))
  }

  // Test 2: Read leads
  console.log('\n=== Test 2: Read leads ===')
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, full_name, email, status')
    .limit(5)
  
  if (leadsError) {
    console.error('❌ Error reading leads:', leadsError.message)
  } else {
    console.log('✅ Leads found:', leads.length)
    leads.forEach(l => console.log(`  - ${l.full_name} (${l.email}) - ${l.status}`))
  }

  // Test 3: Check RLS policies
  console.log('\n=== Test 3: Check users table (will fail due to RLS) ===')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .limit(5)
  
  if (usersError) {
    console.error('❌ Error reading users:', usersError.message)
    console.log('   (This is expected if no user is authenticated)')
  } else {
    console.log('✅ Users found:', users.length)
  }

  // Test 4: Using service role key
  console.log('\n=== Test 4: Admin client with service role ===')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: adminUsers, error: adminError } = await adminClient
    .from('users')
    .select('id, email, full_name, role')
    .limit(5)
  
  if (adminError) {
    console.error('❌ Error with admin client:', adminError.message)
  } else {
    console.log('✅ Users via admin client:', adminUsers.length)
    adminUsers.forEach(u => console.log(`  - ${u.full_name} (${u.email}) - ${u.role}`))
  }

  console.log('\n=== Connection test complete ===')
}

testConnection().catch(console.error)
