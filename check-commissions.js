// Quick script to check commissions in database
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCommissions() {
  console.log('🔍 Checking commissions in database...\n')

  // Get all commissions (bypassing RLS)
  const { data: allCommissions, error: allError } = await supabase
    .from('lead_commissions')
    .select('*')

  if (allError) {
    console.error('❌ Error fetching all commissions:', allError)
    return
  }

  console.log(`📊 Total commissions in database: ${allCommissions?.length || 0}`)
  
  if (allCommissions && allCommissions.length > 0) {
    console.log('\n📋 Commission breakdown:')
    console.log('- By company:')
    const byCompany = allCommissions.reduce((acc, c) => {
      acc[c.company_id] = (acc[c.company_id] || 0) + 1
      return acc
    }, {})
    Object.entries(byCompany).forEach(([companyId, count]) => {
      console.log(`  Company ${companyId}: ${count} commissions`)
    })

    console.log('\n- By status:')
    const byStatus = allCommissions.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {})
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    console.log('\n- Soft deleted:')
    const deleted = allCommissions.filter(c => c.deleted_at !== null)
    console.log(`  Deleted: ${deleted.length}`)
    console.log(`  Active: ${allCommissions.length - deleted.length}`)

    console.log('\n📝 Sample commission:')
    console.log(JSON.stringify(allCommissions[0], null, 2))
  } else {
    console.log('\n⚠️ No commissions found in database!')
    console.log('\nTo create a test commission, you need to:')
    console.log('1. Have a lead with a signed contract')
    console.log('2. Have an invoice for that lead')
    console.log('3. Record a payment on the invoice')
    console.log('4. The auto_create_commissions_from_invoice trigger will create commissions')
  }

  // Check RLS policies
  console.log('\n🔒 Checking RLS policies on lead_commissions table...')
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT 
          polname AS policy_name,
          polcmd AS command,
          qual AS using_expression,
          with_check AS with_check_expression
        FROM pg_policy
        WHERE polrelid = 'lead_commissions'::regclass;
      `
    })

  if (policyError) {
    console.log('⚠️ Could not check RLS policies (exec_sql RPC may not exist)')
  } else if (policies && policies.length > 0) {
    console.log(`Found ${policies.length} RLS policies:`)
    policies.forEach(p => console.log(`- ${p.policy_name} (${p.command})`))
  }

  console.log('\n✅ Check complete')
}

checkCommissions().catch(console.error)
