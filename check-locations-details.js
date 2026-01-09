const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

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

async function checkLocationDetails() {
  console.log('🔍 Checking locations table configuration...\n')

  // Try to check if there are any triggers
  console.log('📋 Attempting to check triggers on locations table...')
  
  // Check RLS policies
  console.log('\n🔒 Checking RLS policies...')
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'locations')

  if (policiesError) {
    console.log('⚠️  Cannot query policies directly:', policiesError.message)
  } else {
    console.log('Policies found:', policies?.length || 0)
    if (policies && policies.length > 0) {
      policies.forEach(p => {
        console.log(`  - ${p.policyname} (${p.cmd}):`, p.qual || p.with_check)
      })
    }
  }

  // Try a simple select to see if RLS is working
  console.log('\n✅ Testing SELECT operation...')
  const { data: selectTest, error: selectError } = await supabase
    .from('locations')
    .select('id, name')
    .limit(1)

  if (selectError) {
    console.log('❌ SELECT failed:', selectError)
  } else {
    console.log('✅ SELECT works:', selectTest?.length || 0, 'rows')
  }

  // Try to update with service role (bypasses RLS)
  console.log('\n🔧 Testing UPDATE with service role...')
  const { data: updateTest, error: updateError } = await supabase
    .from('locations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', '18a6cddb-bde6-4ca0-9aab-2a5f1691ab16')
    .select()

  if (updateError) {
    console.log('❌ UPDATE failed:', updateError)
    console.log('\n🚨 This indicates the issue is NOT with RLS policies!')
    console.log('   The service role key bypasses RLS, so if this fails,')
    console.log('   the problem is likely:')
    console.log('   1. A database trigger causing recursion')
    console.log('   2. A foreign key constraint')
    console.log('   3. A check constraint\n')
  } else {
    console.log('✅ UPDATE works with service role')
    console.log('   This means the RLS policies are the issue')
  }

  console.log('\n📊 Database connection info:')
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
}

checkLocationDetails()
