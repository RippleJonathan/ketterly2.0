// Check for duplicate office manager commissions
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDuplicateOfficeCommissions() {
  console.log('🔍 Checking for duplicate office manager commissions...\n')
  
  // Get Jonathan Ketterman lead commissions
  const leadId = '81be9e45-dbfc-452d-87c8-847213edc0fc' // Jonathan Ketterman lead
  
  const { data: commissions, error } = await supabase
    .from('lead_commissions')
    .select(`
      id,
      user_id,
      users!lead_commissions_user_id_fkey(full_name, email),
      commission_type,
      commission_rate,
      flat_amount,
      calculated_amount,
      paid_when,
      notes,
      created_at
    `)
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('created_at', { asc: true })
  
  if (error) {
    console.log('❌ Error:', error.message)
    return
  }
  
  console.log(`📋 Found ${commissions?.length || 0} commission(s) for this lead:\n`)
  
  // Group by user_id
  const byUser = {}
  commissions?.forEach(comm => {
    const userId = comm.user_id
    if (!byUser[userId]) {
      byUser[userId] = []
    }
    byUser[userId].push(comm)
  })
  
  // Display grouped
  Object.entries(byUser).forEach(([userId, comms]) => {
    const firstComm = comms[0]
    const userName = firstComm.users?.full_name || 'Unknown'
    const count = comms.length
    
    console.log(`👤 ${userName} - ${count} commission(s)${count > 1 ? ' ⚠️  DUPLICATE' : ''}`)
    
    comms.forEach((comm, index) => {
      console.log(`   ${index + 1}. ID: ${comm.id.slice(0, 8)}...`)
      console.log(`      Type: ${comm.commission_type}`)
      console.log(`      Rate/Amount: ${comm.commission_rate || comm.flat_amount}`)
      console.log(`      Calculated: $${comm.calculated_amount || 0}`)
      console.log(`      Paid When: ${comm.paid_when}`)
      console.log(`      Notes: ${comm.notes || 'None'}`)
      console.log(`      Created: ${new Date(comm.created_at).toLocaleString()}`)
      console.log()
    })
  })
}

checkDuplicateOfficeCommissions().catch(console.error)
