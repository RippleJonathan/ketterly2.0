// Check actual commission plan data
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

async function checkPlans() {
  console.log('\n🔍 CHECKING COMMISSION PLAN DATA...\n')

  // Get all active commission plans
  const { data: plans, error } = await supabase
    .from('commission_plans')
    .select('*')
    .is('deleted_at', null)
  
  if (error) {
    console.log('❌ Error:', error)
    return
  }
  
  console.log(`Found ${plans.length} active commission plans:\n`)
  
  plans.forEach(plan => {
    console.log(`Plan: ${plan.name}`)
    console.log(`  ID: ${plan.id}`)
    console.log(`  Type: ${plan.commission_type}`)
    console.log(`  Rate: ${plan.commission_rate}%`)
    console.log(`  Flat Amount: $${plan.flat_amount || 0}`)
    console.log(`  paid_when: "${plan.paid_when}"  ⬅️  CHECK THIS VALUE`)
    console.log(`  Is Active: ${plan.is_active}`)
    console.log('')
  })

  console.log('='.repeat(80))
  console.log('EXPECTED paid_when VALUES (must match exactly):')
  console.log('='.repeat(80))
  console.log('✅ "when_deposit_paid" - Commission earned after first payment')
  console.log('✅ "when_final_payment" - Commission earned when invoice fully paid')
  console.log('✅ "when_job_completed" - Commission earned when job marked complete')
  console.log('✅ "custom" - Custom trigger condition')
  console.log('\n❌ OLD/WRONG VALUES (will NOT work with trigger):')
  console.log('❌ "deposit" - OLD VALUE')
  console.log('❌ "final" - OLD VALUE')
  console.log('❌ "collected" - OLD VALUE')
  console.log('❌ "complete" - OLD VALUE')
  console.log('='.repeat(80) + '\n')

  // Check if any plans have wrong values
  const wrongValues = plans.filter(p => 
    p.paid_when && 
    !['when_deposit_paid', 'when_final_payment', 'when_job_completed', 'custom'].includes(p.paid_when)
  )
  
  if (wrongValues.length > 0) {
    console.log('🚨 PROBLEM FOUND!')
    console.log(`${wrongValues.length} plan(s) have INCORRECT paid_when values:\n`)
    wrongValues.forEach(p => {
      console.log(`  - "${p.name}": paid_when = "${p.paid_when}"`)
    })
    console.log('\nYou need to update these to the correct values!')
    console.log('Run this SQL in Supabase Dashboard:\n')
    console.log('UPDATE commission_plans SET paid_when = \'when_deposit_paid\' WHERE paid_when = \'deposit\';')
    console.log('UPDATE commission_plans SET paid_when = \'when_final_payment\' WHERE paid_when = \'final\' OR paid_when = \'collected\';')
    console.log('UPDATE commission_plans SET paid_when = \'when_job_completed\' WHERE paid_when = \'complete\';')
    console.log('')
  } else {
    console.log('✅ All commission plans have correct paid_when values!')
  }
}

checkPlans().catch(console.error)
