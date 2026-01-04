require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testPageQuery() {
  const marketingUserId = '48421940-0fff-4456-a65f-4a45b4ee91f8'
  
  console.log('🔍 Testing exact query from page.tsx...\n')
  
  // Exact query from the page
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select(`
      company_id, 
      id,
      user_permissions (*)
    `)
    .eq('id', marketingUserId)
    .single()
  
  console.log('Query result:')
  console.log('  Error:', userDataError)
  console.log('  Data:', JSON.stringify(userData, null, 2))
  
  if (userData) {
    const userPermissions = (userData.user_permissions)?.[0] || null
    console.log('\nExtracted permissions:', userPermissions)
    console.log('Has permissions:', !!userPermissions)
    
    if (userPermissions) {
      console.log('\nTab permissions:')
      console.log('  - can_view_lead_orders:', userPermissions.can_view_lead_orders)
      console.log('  - can_view_lead_payments:', userPermissions.can_view_lead_payments)
      console.log('  - can_view_lead_financials:', userPermissions.can_view_lead_financials)
      console.log('  - can_view_lead_commissions:', userPermissions.can_view_lead_commissions)
    }
  }
}

testPageQuery()
