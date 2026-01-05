// Check RLS policies on payments table
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Test with both clients
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkRLS() {
  const companyId = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34'
  const year = 2026
  
  console.log('\n=== Testing RLS on Payments ===')
  
  // Test 1: Service role key (bypasses RLS)
  console.log('\n--- Admin Client (bypasses RLS) ---')
  const { data: adminData, error: adminError } = await adminSupabase
    .from('payments')
    .select('payment_number, deleted_at')
    .eq('company_id', companyId)
    .like('payment_number', `PAY-${year}-%`)
  
  console.log('Found:', adminData?.length || 0)
  console.log('Error:', adminError)
  if (adminData) {
    adminData.forEach(p => console.log(`  - ${p.payment_number}`))
  }
  
  // Test 2: Anon key (respects RLS)
  console.log('\n--- Anon Client (respects RLS) ---')
  const { data: anonData, error: anonError } = await anonSupabase
    .from('payments')
    .select('payment_number, deleted_at')
    .eq('company_id', companyId)
    .like('payment_number', `PAY-${year}-%`)
  
  console.log('Found:', anonData?.length || 0)
  console.log('Error:', anonError)
  if (anonData) {
    anonData.forEach(p => console.log(`  - ${p.payment_number}`))
  }
}

checkRLS().catch(console.error)
