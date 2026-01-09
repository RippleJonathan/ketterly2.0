// Check Todd's commission plan
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPlan() {
  const planId = 'd4f8232a-5258-4ce2-aa34-034980e020f2'
  
  const { data, error } = await supabase
    .from('commission_plans')
    .select('*')
    .eq('id', planId)
    .single()
  
  console.log('Commission Plan:')
  console.log(JSON.stringify(data, null, 2))
  console.log('Error:', error)
}

checkPlan().catch(console.error)
