require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkMarketingRole() {
  // Check company_roles table
  const { data: roles } = await supabase
    .from('company_roles')
    .select('role_name, permissions')
    .eq('role_name', 'marketing')
  
  console.log('Marketing roles in company_roles:', JSON.stringify(roles, null, 2))
  
  // Check actual marketing user permissions
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('role', 'marketing')
  
  console.log('\nMarketing users:', users)
  
  if (users && users.length > 0) {
    for (const user of users) {
      const { data: perms } = await supabase
        .from('user_permissions')
        .select('can_view_lead_orders, can_view_lead_payments, can_view_lead_financials, can_view_lead_commissions')
        .eq('user_id', user.id)
        .single()
      
      console.log(`\nPermissions for ${user.full_name}:`, perms)
    }
  }
}

checkMarketingRole().catch(console.error)
