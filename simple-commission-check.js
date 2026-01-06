// Simple trigger check without exec_sql
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

async function simpleCheck() {
  console.log('\n🔍 SIMPLE COMMISSION CHECK...\n')

  // 1. Get most recent invoice
  console.log('1️⃣ Getting most recent invoice...')
  const { data: invoice } = await supabase
    .from('customer_invoices')
    .select('*, leads(sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id, company_id)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  console.log('✅ Invoice:', invoice?.invoice_number)
  console.log('   Lead ID:', invoice?.lead_id)
  console.log('   Total:', invoice?.total_amount)

  // 2. Check for commissions
  console.log('\n2️⃣ Checking for commissions...')
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select('*')
    .eq('lead_id', invoice.lead_id)
    .is('deleted_at', null)
  
  console.log(`${commissions?.length || 0} commissions found for this lead`)

  // 3. Check assigned users
  console.log('\n3️⃣ Checking assigned users and their commission plans...')
  const userIds = [
    invoice.leads.sales_rep_id,
    invoice.leads.marketing_rep_id,
    invoice.leads.sales_manager_id,
    invoice.leads.production_manager_id
  ].filter(Boolean)
  
  console.log(`${userIds.length} users assigned to lead`)
  
  for (const userId of userIds) {
    const { data: user } = await supabase
      .from('users')
      .select('full_name, commission_plan_id')
      .eq('id', userId)
      .single()
    
    if (user?.commission_plan_id) {
      const { data: plan } = await supabase
        .from('commission_plans')
        .select('name, commission_type, commission_rate, paid_when')
        .eq('id', user.commission_plan_id)
        .single()
      
      console.log(`✅ ${user.full_name}: ${plan?.name} (${plan?.commission_rate}% ${plan?.paid_when})`)
    } else {
      console.log(`❌ ${user?.full_name}: NO COMMISSION PLAN`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('NEXT STEPS:')
  console.log('='.repeat(80))
  console.log('1. Run the migration in Supabase Dashboard SQL Editor:')
  console.log('   - Open fix-commission-automation-complete.sql')
  console.log('   - Copy all the SQL')
  console.log('   - Paste into Supabase Dashboard > SQL Editor')
  console.log('   - Run it')
  console.log('')
  console.log('2. After migration, create a NEW invoice (trigger only fires on INSERT)')
  console.log('')
  console.log('3. Commissions should auto-create for all users with commission plans')
  console.log('='.repeat(80) + '\n')
}

simpleCheck().catch(console.error)
