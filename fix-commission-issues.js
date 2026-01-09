// Fix commission issues:
// 1. Delete duplicate office manager commissions (keep only 1)
// 2. Fix Todd's flat commission calculated_amount

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixCommissions() {
  console.log('🔧 Fixing commission issues...\n')
  
  const leadId = '81be9e45-dbfc-452d-87c8-847213edc0fc' // Jonathan Ketterman lead
  
  // 1. Fix duplicate office commissions
  console.log('1️⃣ Fixing duplicate office manager commissions...')
  
  // Get Jonathan Ketterman's user ID (office manager)
  const { data: jonathan } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'jonketterman@gmail.com')
    .single()
  
  if (!jonathan) {
    console.log('❌ Jonathan Ketterman not found')
    return
  }
  
  // Get all his commissions for this lead
  const { data: officeComms } = await supabase
    .from('lead_commissions')
    .select('id, created_at, calculated_amount')
    .eq('lead_id', leadId)
    .eq('user_id', jonathan.id)
    .is('deleted_at', null)
    .order('created_at', { asc: true })
  
  if (officeComms && officeComms.length > 1) {
    console.log(`   Found ${officeComms.length} office commissions`)
    console.log(`   Keeping: ${officeComms[0].id.slice(0, 8)}... (oldest)`)
    
    // Delete all except the first one
    const toDelete = officeComms.slice(1)
    for (const comm of toDelete) {
      const { error } = await supabase
        .from('lead_commissions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', comm.id)
      
      if (error) {
        console.log(`   ❌ Failed to delete ${comm.id.slice(0, 8)}: ${error.message}`)
      } else {
        console.log(`   ✅ Deleted duplicate: ${comm.id.slice(0, 8)}...`)
      }
    }
  } else {
    console.log(`   ✅ No duplicates found (${officeComms?.length || 0} commission(s))`)
  }
  
  console.log()
  
  // 2. Fix Todd's flat commission
  console.log('2️⃣ Fixing Todd Night flat commission calculated_amount...')
  
  const { data: todd } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'todd@rippleroofs.com')
    .single()
  
  if (!todd) {
    console.log('❌ Todd not found')
    return
  }
  
  // Get Todd's commission for this lead
  const { data: toddComm } = await supabase
    .from('lead_commissions')
    .select('id, flat_amount, calculated_amount, balance_owed')
    .eq('lead_id', leadId)
    .eq('user_id', todd.id)
    .is('deleted_at', null)
    .single()
  
  if (!toddComm) {
    console.log('❌ Todd commission not found')
    return
  }
  
  console.log(`   Current: flat_amount=$${toddComm.flat_amount}, calculated_amount=$${toddComm.calculated_amount}, balance_owed=$${toddComm.balance_owed}`)
  
  if (toddComm.flat_amount && toddComm.calculated_amount === 0) {
    const { error } = await supabase
      .from('lead_commissions')
      .update({
        calculated_amount: toddComm.flat_amount,
        base_amount: toddComm.flat_amount,
      })
      .eq('id', toddComm.id)
    
    if (error) {
      console.log(`   ❌ Failed to update: ${error.message}`)
    } else {
      console.log(`   ✅ Updated calculated_amount to $${toddComm.flat_amount}`)
    }
  } else {
    console.log('   ℹ️  No update needed')
  }
  
  console.log('\n✅ Done!')
}

fixCommissions().catch(console.error)
