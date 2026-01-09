// Direct check of Todd's commission from database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function directCheck() {
  const leadId = '81be9e45-dbfc-452d-87c8-847213edc0fc'
  
  const { data: todd } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'todd@rippleroofs.com')
    .single()
  
  const { data, error } = await supabase
    .from('lead_commissions')
    .select('*')
    .eq('lead_id', leadId)
    .eq('user_id', todd.id)
    .is('deleted_at', null)
    .single()
  
  console.log('Raw data:', JSON.stringify(data, null, 2))
  console.log('Error:', error)
}

directCheck().catch(console.error)
