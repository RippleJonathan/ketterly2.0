// Check trigger execution logs

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure .env.local has:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTriggerLogs() {
  console.log('\n🔍 Checking trigger execution logs...\n')

  // Get the most recent invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('customer_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (invoiceError) {
    console.log('❌ Error fetching invoice:', invoiceError.message)
    return
  }

  console.log('📄 Most recent invoice:')
  console.log({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    lead_id: invoice.lead_id,
    total: invoice.total,
    created_at: invoice.created_at
  })

  // Get trigger logs for this invoice
  const { data: logs, error: logsError } = await supabase
    .from('trigger_execution_logs')
    .select('*')
    .eq('record_id', invoice.id)
    .order('created_at', { ascending: true })

  if (logsError) {
    console.log('\n❌ Error fetching trigger logs:', logsError.message)
    console.log('The trigger_execution_logs table might not exist yet.')
    console.log('Run add-trigger-logging-table.sql first!\n')
    return
  }

  if (!logs || logs.length === 0) {
    console.log('\n⚠️  NO TRIGGER LOGS FOUND FOR THIS INVOICE!')
    console.log('This means the trigger did not fire at all.\n')
    
    // Check if trigger exists
    console.log('Checking if any trigger logs exist at all...\n')
    const { data: anyLogs } = await supabase
      .from('trigger_execution_logs')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false })
    
    if (anyLogs && anyLogs.length > 0) {
      console.log(`Found ${anyLogs.length} other trigger logs (most recent):`)
      anyLogs.forEach(log => {
        console.log(`  - ${log.created_at}: ${log.message}`)
      })
    } else {
      console.log('No trigger logs found at all. Trigger might not be set up correctly.')
    }
    
    return
  }

  console.log(`\n✅ Found ${logs.length} trigger execution logs:\n`)
  
  logs.forEach((log, index) => {
    console.log(`${index + 1}. [${log.created_at}] ${log.message}`)
    if (log.data) {
      console.log('   Data:', JSON.stringify(log.data, null, 2))
    }
  })

  // Check for commissions on this lead
  const { data: commissions } = await supabase
    .from('lead_commissions')
    .select('*')
    .eq('lead_id', invoice.lead_id)
    .is('deleted_at', null)

  console.log(`\n💰 Commissions created: ${commissions?.length || 0}`)
  if (commissions && commissions.length > 0) {
    commissions.forEach(c => {
      console.log(`  - User: ${c.user_id}, Amount: $${c.calculated_amount}, Status: ${c.status}`)
    })
  }
}

checkTriggerLogs()
