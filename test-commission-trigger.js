// Test commission auto-creation trigger
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

async function testTrigger() {
  console.log('\n🔍 TESTING COMMISSION AUTO-CREATE TRIGGER...\n')

  // 1. Check if trigger exists
  console.log('1️⃣ Checking if trigger exists...')
  const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        trigger_name,
        event_object_table,
        action_timing,
        event_manipulation,
        tgenabled
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_auto_create_commissions_on_invoice'
    `
  })
  
  if (triggerError) {
    console.log('❌ Error checking trigger:', triggerError)
  } else if (!triggers || triggers.length === 0) {
    console.log('❌ TRIGGER NOT FOUND! You need to run the migration.')
    return
  } else {
    console.log('✅ Trigger exists:', triggers[0])
  }

  // 2. Check function exists
  console.log('\n2️⃣ Checking trigger function...')
  const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT p.proname as function_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'auto_create_commissions_on_invoice'
    `
  })
  
  if (funcError) {
    console.log('❌ Error checking function:', funcError)
  } else if (!functions || functions.length === 0) {
    console.log('❌ FUNCTION NOT FOUND!')
  } else {
    console.log('✅ Function exists')
  }

  // 3. Get a recent invoice to test with
  console.log('\n3️⃣ Getting most recent invoice...')
  const { data: invoice, error: invoiceError } = await supabase
    .from('customer_invoices')
    .select('*, leads(sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id, company_id)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (invoiceError) {
    console.log('❌ Error getting invoice:', invoiceError)
    return
  }
  
  console.log('Invoice found:', invoice.invoice_number)
  console.log('Lead ID:', invoice.lead_id)
  console.log('Assigned users:', {
    sales_rep: invoice.leads?.sales_rep_id,
    marketing_rep: invoice.leads?.marketing_rep_id,
    sales_manager: invoice.leads?.sales_manager_id,
    production_manager: invoice.leads?.production_manager_id
  })

  // 4. Check if commissions exist for this invoice's lead
  console.log('\n4️⃣ Checking for commissions on this lead...')
  const { data: commissions, error: commError } = await supabase
    .from('lead_commissions')
    .select('*, users(full_name, email)')
    .eq('lead_id', invoice.lead_id)
    .is('deleted_at', null)
  
  if (commError) {
    console.log('❌ Error checking commissions:', commError)
  } else {
    console.log(`Found ${commissions?.length || 0} commissions:`)
    commissions?.forEach(c => {
      console.log(`  - User: ${c.users?.full_name}, Amount: $${c.calculated_amount}, Status: ${c.status}`)
    })
  }

  // 5. Check if assigned users have commission plans
  console.log('\n5️⃣ Checking commission plans for assigned users...')
  const assignedUserIds = [
    invoice.leads?.sales_rep_id,
    invoice.leads?.marketing_rep_id,
    invoice.leads?.sales_manager_id,
    invoice.leads?.production_manager_id
  ].filter(Boolean)
  
  if (assignedUserIds.length === 0) {
    console.log('❌ No users assigned to this lead!')
    return
  }
  
  for (const userId of assignedUserIds) {
    const { data: user } = await supabase
      .from('users')
      .select('full_name, commission_plan_id, commission_plans(name, commission_type, commission_rate, paid_when)')
      .eq('id', userId)
      .single()
    
    if (user) {
      console.log(`  - ${user.full_name}:`)
      if (user.commission_plan_id) {
        console.log(`    ✅ Has plan: ${user.commission_plans?.name || 'Unknown'}`)
        console.log(`       Type: ${user.commission_plans?.commission_type}, Rate: ${user.commission_plans?.commission_rate}%, Paid: ${user.commission_plans?.paid_when}`)
      } else {
        console.log(`    ❌ NO COMMISSION PLAN ASSIGNED!`)
      }
    }
  }

  // 6. Try to manually trigger the function (test mode)
  console.log('\n6️⃣ Testing trigger function manually...')
  console.log('Attempting to call trigger function for invoice:', invoice.id)
  
  const { data: testResult, error: testError } = await supabase.rpc('exec_sql', {
    sql_query: `
      -- Test the trigger function logic
      DO $$
      DECLARE
        v_lead RECORD;
        v_company_id UUID;
        v_user_ids UUID[];
        v_user_id UUID;
        v_invoice_id UUID := '${invoice.id}';
        v_lead_id UUID := '${invoice.lead_id}';
      BEGIN
        -- Get lead info
        SELECT l.*, l.company_id INTO v_lead
        FROM leads l
        WHERE l.id = v_lead_id;
        
        RAISE NOTICE 'Lead found: %, company: %', v_lead.id, v_lead.company_id;
        
        -- Collect user IDs
        v_user_ids := ARRAY[]::UUID[];
        
        IF v_lead.sales_rep_id IS NOT NULL THEN
          v_user_ids := array_append(v_user_ids, v_lead.sales_rep_id);
          RAISE NOTICE 'Added sales rep: %', v_lead.sales_rep_id;
        END IF;
        
        IF v_lead.marketing_rep_id IS NOT NULL THEN
          v_user_ids := array_append(v_user_ids, v_lead.marketing_rep_id);
          RAISE NOTICE 'Added marketing rep: %', v_lead.marketing_rep_id;
        END IF;
        
        IF v_lead.sales_manager_id IS NOT NULL THEN
          v_user_ids := array_append(v_user_ids, v_lead.sales_manager_id);
          RAISE NOTICE 'Added sales manager: %', v_lead.sales_manager_id;
        END IF;
        
        IF v_lead.production_manager_id IS NOT NULL THEN
          v_user_ids := array_append(v_user_ids, v_lead.production_manager_id);
          RAISE NOTICE 'Added production manager: %', v_lead.production_manager_id;
        END IF;
        
        RAISE NOTICE 'Total users to process: %', array_length(v_user_ids, 1);
        
        -- Loop through users
        FOREACH v_user_id IN ARRAY v_user_ids
        LOOP
          DECLARE
            v_user RECORD;
            v_plan RECORD;
          BEGIN
            -- Get user
            SELECT * INTO v_user FROM users WHERE id = v_user_id;
            RAISE NOTICE 'Processing user: %, commission_plan_id: %', v_user_id, v_user.commission_plan_id;
            
            IF v_user.commission_plan_id IS NULL THEN
              RAISE NOTICE 'User % has no commission plan', v_user_id;
              CONTINUE;
            END IF;
            
            -- Get plan
            SELECT * INTO v_plan FROM commission_plans WHERE id = v_user.commission_plan_id;
            
            IF v_plan IS NOT NULL THEN
              RAISE NOTICE 'Found plan for user %: % (%, %)', v_user_id, v_plan.name, v_plan.commission_type, v_plan.commission_rate;
            ELSE
              RAISE NOTICE 'Plan not found for user %', v_user_id;
            END IF;
          END;
        END LOOP;
        
        RAISE NOTICE 'Test complete!';
      END $$;
    `
  })
  
  if (testError) {
    console.log('❌ Error testing function:', testError)
  } else {
    console.log('✅ Test function executed - check NOTICES above for details')
  }

  console.log('\n' + '='.repeat(80))
  console.log('DIAGNOSIS SUMMARY:')
  console.log('='.repeat(80))
  
  if (!triggers || triggers.length === 0) {
    console.log('❌ PROBLEM: Trigger does not exist - run the migration!')
  } else if (assignedUserIds.length === 0) {
    console.log('❌ PROBLEM: No users assigned to lead - assign users first!')
  } else {
    console.log('✅ Trigger exists and is configured')
    console.log('📋 Next steps:')
    console.log('   1. Make sure ALL assigned users have commission plans')
    console.log('   2. Try creating a NEW invoice (trigger only fires on INSERT)')
    console.log('   3. Check Supabase logs for NOTICE messages during invoice creation')
  }
  console.log('='.repeat(80) + '\n')
}

testTrigger().catch(console.error)
