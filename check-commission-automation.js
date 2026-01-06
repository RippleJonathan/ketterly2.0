// Check commission automation status
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

async function checkAutomation() {
  console.log('\n🔍 CHECKING COMMISSION AUTOMATION...\n')

  // 1. Check if trigger exists and is enabled
  console.log('1️⃣ Checking database trigger...')
  const { data: triggers } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        tgenabled as enabled
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_auto_update_commission_eligibility'
    `
  })
  
  if (triggers && triggers.length > 0) {
    console.log('✅ Trigger exists:', triggers[0])
  } else {
    console.log('❌ Trigger NOT found! This is why commissions aren\'t updating.')
  }

  // 2. Check trigger function
  console.log('\n2️⃣ Checking trigger function...')
  const { data: functions } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'auto_update_commission_eligibility'
    `
  })
  
  if (functions && functions.length > 0) {
    console.log('✅ Function exists')
    // Check if it has the correct paid_when values
    const def = functions[0].definition
    if (def.includes('when_deposit_paid')) {
      console.log('✅ Function has CORRECT paid_when values')
    } else if (def.includes("'deposit'")) {
      console.log('❌ Function has OLD/WRONG paid_when values (deposit, final, complete)')
      console.log('   Need to run fix-commission-trigger.sql migration!')
    }
  } else {
    console.log('❌ Function NOT found!')
  }

  // 3. Check most recent payment
  console.log('\n3️⃣ Checking recent payments...')
  const { data: payments } = await supabase
    .from('payments')
    .select('*, customer_invoices(lead_id)')
    .order('created_at', { ascending: false })
    .limit(3)
  
  console.log(`Found ${payments?.length || 0} recent payments:`)
  payments?.forEach(p => {
    console.log(`   - Payment ${p.payment_number}: $${p.amount}, cleared: ${p.cleared_at ? '✅' : '❌'}, deleted: ${p.deleted_at ? '✅' : '❌'}`)
  })

  // 4. Check commissions for the leads with recent payments
  if (payments && payments.length > 0) {
    const leadId = payments[0].customer_invoices?.lead_id
    if (leadId) {
      console.log(`\n4️⃣ Checking commissions for lead ${leadId}...`)
      const { data: commissions } = await supabase
        .from('lead_commissions')
        .select('*')
        .eq('lead_id', leadId)
        .is('deleted_at', null)
      
      console.log(`Found ${commissions?.length || 0} commissions:`)
      commissions?.forEach(c => {
        console.log(`   - User: ${c.user_id?.substring(0, 8)}..., Status: ${c.status}, Paid When: ${c.paid_when}, Amount: $${c.calculated_amount}`)
        if (c.status === 'pending' && c.paid_when === 'when_deposit_paid' && payments[0].cleared_at) {
          console.log('     ⚠️  Should be ELIGIBLE (deposit paid and cleared)!')
        }
      })
    }
  }

  // 5. Check for invoice creation hooks
  console.log('\n5️⃣ Checking invoice automation triggers...')
  const { data: invoiceTriggers } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing
      FROM information_schema.triggers 
      WHERE event_object_table = 'customer_invoices'
      ORDER BY trigger_name
    `
  })
  
  if (invoiceTriggers && invoiceTriggers.length > 0) {
    console.log('Invoice triggers found:')
    invoiceTriggers.forEach(t => {
      console.log(`   - ${t.trigger_name} (${t.event_manipulation} ${t.action_timing})`)
    })
  } else {
    console.log('❌ No invoice triggers found - commissions won\'t auto-create on invoice creation')
  }

  // 6. Check contract automation
  console.log('\n6️⃣ Checking contract automation triggers...')
  const { data: contractTriggers } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing
      FROM information_schema.triggers 
      WHERE event_object_table = 'contract_signatures'
      OR event_object_table = 'contracts'
      ORDER BY trigger_name
    `
  })
  
  if (contractTriggers && contractTriggers.length > 0) {
    console.log('Contract triggers found:')
    contractTriggers.forEach(t => {
      console.log(`   - ${t.trigger_name} (${t.event_manipulation} ${t.action_timing})`)
    })
  } else {
    console.log('❌ No contract triggers found - invoices won\'t auto-create on contract signing')
  }

  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY OF MISSING AUTOMATION:')
  console.log('='.repeat(80))
  console.log('❌ Contract signed → Auto-create invoice: MISSING')
  console.log('❌ Invoice created → Auto-create commissions: MISSING')
  console.log('❓ Payment recorded → Update commission eligibility: CHECK TRIGGER')
  console.log('❌ Change order created → Update commissions: MISSING')
  console.log('❌ Commission paid → Update balance_owed: MISSING')
  console.log('='.repeat(80) + '\n')
}

checkAutomation().catch(console.error)
