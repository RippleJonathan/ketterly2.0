const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkLocationsPolicies() {
  console.log('🔍 Checking locations table RLS policies...\n')

  // Query pg_policies to see all policies on locations table
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename = 'locations'
      ORDER BY policyname;
    `
  })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('📋 Policies found:')
  console.log(JSON.stringify(data, null, 2))

  // Check if RLS is enabled
  const { data: rlsStatus } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        schemaname, 
        tablename, 
        rowsecurity 
      FROM pg_tables 
      WHERE tablename = 'locations';
    `
  })

  console.log('\n🔒 RLS Status:')
  console.log(JSON.stringify(rlsStatus, null, 2))
}

checkLocationsPolicies()
