// Check if trigger is attached and enabled

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTriggerStatus() {
  console.log('\n🔍 Checking trigger status...\n')

  // Check if trigger exists
  const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        t.tgname as trigger_name,
        t.tgenabled as enabled,
        p.proname as function_name,
        c.relname as table_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE t.tgname = 'trigger_auto_create_commissions_on_invoice'
    `
  })

  if (triggerError) {
    console.log('❌ Error checking trigger:', triggerError.message)
    console.log('(exec_sql RPC might not exist - this is expected)\n')
    
    // Alternative: Check using information_schema (might not work with RLS)
    console.log('Trying alternative method...\n')
    return
  }

  if (triggers && triggers.length > 0) {
    console.log('✅ Trigger exists:')
    console.log(triggers)
  } else {
    console.log('❌ Trigger NOT found!')
  }

  // Check the most recent invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('customer_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (invoiceError) {
    console.log('\n❌ Error fetching invoice:', invoiceError.message)
    return
  }

  console.log('\n📄 Most recent invoice:')
  console.log({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    lead_id: invoice.lead_id,
    total: invoice.total,
    created_at: invoice.created_at
  })

  // Check for commissions on this lead
  const { data: commissions, error: commissionsError } = await supabase
    .from('lead_commissions')
    .select('*')
    .eq('lead_id', invoice.lead_id)
    .is('deleted_at', null)

  console.log(`\n💰 Commissions for this lead: ${commissions?.length || 0}`)
  if (commissions && commissions.length > 0) {
    console.log(commissions)
  }

  // Check lead users
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id')
    .eq('id', invoice.lead_id)
    .single()

  if (lead) {
    console.log('\n👥 Lead users:')
    console.log({
      sales_rep_id: lead.sales_rep_id,
      marketing_rep_id: lead.marketing_rep_id,
      sales_manager_id: lead.sales_manager_id,
      production_manager_id: lead.production_manager_id
    })
  }
}

checkTriggerStatus()
