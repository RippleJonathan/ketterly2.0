// Check and fix the commission plan issue

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixCommissionPlan() {
  console.log('\n🔍 Checking commission plan for user 48421940-0fff-4456-a65f-4a45b4ee91f8...\n')

  // Get all commission plans
  const { data: plans } = await supabase
    .from('commission_plans')
    .select('*')
    .is('deleted_at', null)

  console.log('All commission plans:')
  plans?.forEach(plan => {
    console.log(`\n- ${plan.name}:`)
    console.log(`  ID: ${plan.id}`)
    console.log(`  Type: "${plan.commission_type}"`)
    console.log(`  Rate: ${plan.commission_rate}`)
    console.log(`  Flat: ${plan.flat_amount}`)
    console.log(`  Paid When: ${plan.paid_when}`)
  })

  console.log('\n\n✅ Valid commission_type values: percentage, flat_amount, custom')
  
  // Find plans with invalid types
  const invalidPlans = plans?.filter(p => 
    !['percentage', 'flat_amount', 'custom'].includes(p.commission_type)
  )

  if (invalidPlans && invalidPlans.length > 0) {
    console.log('\n❌ Found plans with INVALID commission_type:\n')
    invalidPlans.forEach(plan => {
      console.log(`- ${plan.name}: "${plan.commission_type}"`)
    })
  }
}

fixCommissionPlan()
