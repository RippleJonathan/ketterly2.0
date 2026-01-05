// Check what the payment query actually returns
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkQuery() {
  const companyId = '2ff29cd1-22b1-4dc3-b1df-689d5e141c34'
  const year = 2026
  
  console.log('\n=== Testing Payment Query ===')
  console.log('Company ID:', companyId)
  console.log('Year:', year)
  
  // Test 1: Get all payments without like clause
  console.log('\n--- Test 1: All payments for company (no year filter) ---')
  const { data: allPayments } = await supabase
    .from('payments')
    .select('payment_number, deleted_at, created_at')
    .eq('company_id', companyId)
    .order('payment_number', { ascending: false })
  
  console.log('Found:', allPayments?.length || 0)
  if (allPayments) {
    allPayments.forEach(p => {
      console.log(`  - ${p.payment_number} | Deleted: ${p.deleted_at ? 'YES' : 'NO'} | Created: ${p.created_at}`)
    })
  }
  
  // Test 2: Using like clause
  console.log('\n--- Test 2: Using .like() clause ---')
  const { data: likePayments } = await supabase
    .from('payments')
    .select('payment_number, deleted_at')
    .eq('company_id', companyId)
    .like('payment_number', `PAY-${year}-%`)
    .order('payment_number', { ascending: false })
  
  console.log('Found:', likePayments?.length || 0)
  if (likePayments) {
    likePayments.forEach(p => {
      console.log(`  - ${p.payment_number} | Deleted: ${p.deleted_at ? 'YES' : 'NO'}`)
    })
  }
  
  // Test 3: Using ilike clause (case insensitive)
  console.log('\n--- Test 3: Using .ilike() clause ---')
  const { data: ilikePayments } = await supabase
    .from('payments')
    .select('payment_number, deleted_at')
    .eq('company_id', companyId)
    .ilike('payment_number', `PAY-${year}-%`)
    .order('payment_number', { ascending: false })
  
  console.log('Found:', ilikePayments?.length || 0)
  if (ilikePayments) {
    ilikePayments.forEach(p => {
      console.log(`  - ${p.payment_number} | Deleted: ${p.deleted_at ? 'YES' : 'NO'}`)
    })
  }
  
  // Test 4: Direct SQL check
  console.log('\n--- Test 4: Direct SQL check ---')
  const { data: sqlPayments } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT payment_number, deleted_at 
      FROM payments 
      WHERE company_id = '${companyId}' 
        AND payment_number LIKE 'PAY-${year}-%'
      ORDER BY payment_number DESC
    `
  })
  
  console.log('SQL Result:', sqlPayments)
}

checkQuery().catch(console.error)
