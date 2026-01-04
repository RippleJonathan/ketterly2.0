require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTriggerAndUser() {
  const marketingUserId = '48421940-0fff-4456-a65f-4a45b4ee91f8'
  
  console.log('🔍 Checking trigger and marketing user...\n')
  
  // 1. Check if trigger exists
  console.log('1. Checking if trigger exists:')
  const { data: triggers, error: triggerError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_statement
        FROM information_schema.triggers
        WHERE trigger_name = 'trigger_create_user_permissions'
          AND event_object_table = 'users';
      `
    })
  
  if (triggerError) {
    console.error('❌ Error checking trigger:', triggerError)
  } else if (triggers && triggers.length > 0) {
    console.log('✅ Trigger exists:', triggers[0])
  } else {
    console.log('❌ Trigger NOT found!')
  }
  
  console.log('\n2. Checking marketing user:')
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', marketingUserId)
    .single()
  
  if (userError) {
    console.error('❌ User not found:', userError)
  } else {
    console.log('✅ User exists:', user)
  }
  
  console.log('\n3. Checking user_permissions for this user:')
  const { data: permissions, error: permError } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', marketingUserId)
    .single()
  
  if (permError) {
    console.error('❌ No permissions found:', permError.message)
  } else {
    console.log('✅ Permissions exist!')
    console.log('   Tab permissions:')
    console.log('   - can_view_lead_orders:', permissions.can_view_lead_orders)
    console.log('   - can_view_lead_payments:', permissions.can_view_lead_payments)
    console.log('   - can_view_lead_financials:', permissions.can_view_lead_financials)
    console.log('   - can_view_lead_commissions:', permissions.can_view_lead_commissions)
  }
  
  console.log('\n4. Checking company_roles for marketing:')
  const { data: role, error: roleError } = await supabase
    .from('company_roles')
    .select('role_name, permissions')
    .eq('role_name', 'marketing')
    .single()
  
  if (roleError) {
    console.error('❌ Role not found:', roleError)
  } else {
    console.log('✅ Marketing role permissions:')
    console.log('   - can_view_lead_orders:', role.permissions.can_view_lead_orders)
    console.log('   - can_view_lead_payments:', role.permissions.can_view_lead_payments)
    console.log('   - can_view_lead_financials:', role.permissions.can_view_lead_financials)
    console.log('   - can_view_lead_commissions:', role.permissions.can_view_lead_commissions)
  }
}

checkTriggerAndUser()
