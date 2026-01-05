// Check if commission joins are working
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkJoins() {
  console.log('🔍 Testing commission query with joins...\n')

  const companyId = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34'

  // Test the exact query from the API
  const { data, error } = await supabase
    .from('lead_commissions')
    .select(`
      *,
      user:user_id(id, full_name, email, avatar_url),
      lead:lead_id(id, full_name, address, city)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Query error:', error)
    console.error('\nThis could be due to:')
    console.error('1. Foreign key constraint naming mismatch')
    console.error('2. Missing user/lead records')
    console.error('3. RLS policies blocking the join')
    return
  }

  console.log(`✅ Query successful! Found ${data?.length || 0} commissions\n`)

  if (data && data.length > 0) {
    console.log('📋 First commission with relations:')
    console.log(JSON.stringify(data[0], null, 2))
  } else {
    console.log('⚠️ No active commissions found (all might be soft-deleted)')
  }
}

checkJoins().catch(console.error)
