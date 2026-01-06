// Check commission plan that's failing constraint

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCommissionType() {
  console.log('\n🔍 Checking commission plans for constraint issue...\n')

  // Get the user that's failing
  const failingUserId = '48421940-0fff-4456-a65f-4a45b4ee91f8'
  
  const { data: user } = await supabase
    .from('users')
    .select('*, commission_plan:commission_plans(*)')
    .eq('id', failingUserId)
    .single()

  if (user) {
    console.log('User:', {
      id: user.id,
      full_name: user.full_name,
      commission_plan_id: user.commission_plan_id
    })
    
    if (user.commission_plan) {
      console.log('\nCommission Plan:', {
        name: user.commission_plan.name,
        commission_type: user.commission_plan.commission_type,
        commission_rate: user.commission_plan.commission_rate,
        flat_amount: user.commission_plan.flat_amount,
        paid_when: user.commission_plan.paid_when
      })
      
      console.log('\n⚠️  Check if commission_type is valid:')
      console.log('   Valid values: percentage, flat_amount, custom')
      console.log('   Current value:', `"${user.commission_plan.commission_type}"`)
    }
  }
}

checkCommissionType()
