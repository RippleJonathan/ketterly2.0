/**
 * Setup Test: Assign lead to multiple users for notification testing
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupTestLead() {
  console.log('🔧 Setting up test lead for notifications')
  console.log('=' .repeat(60))
  
  // Get Jonathan
  const { data: jonathan } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'jonathan@rippleroofs.com')
    .single()
  
  console.log('✅ User 1 (Jonathan):', jonathan.email, jonathan.id)
  
  // Get another user
  const { data: otherUsers } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', jonathan.company_id)
    .neq('id', jonathan.id)
    .limit(1)
  
  if (!otherUsers || otherUsers.length === 0) {
    console.log('❌ No other users found in company')
    console.log('   Cannot test notifications without multiple users')
    return
  }
  
  const tyler = otherUsers[0]
  console.log('✅ User 2 (Tyler):', tyler.email, tyler.id)
  
  // Get a lead assigned to Jonathan
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', jonathan.company_id)
    .is('deleted_at', null)
    .limit(1)
    .single()
  
  console.log('\n📋 Test Lead:', lead.full_name)
  console.log('   Lead ID:', lead.id)
  console.log('   Current assignment:')
  console.log('      Sales Rep:', lead.sales_rep_id)
  console.log('      Marketing Rep:', lead.marketing_rep_id)
  
  // Update lead to assign to Tyler as sales rep (so Jonathan can add notes)
  const { error } = await supabase
    .from('leads')
    .update({
      sales_rep_id: tyler.id,
      marketing_rep_id: jonathan.id, // Keep Jonathan as marketing rep
    })
    .eq('id', lead.id)
  
  if (error) {
    console.error('❌ Failed to update lead:', error)
    return
  }
  
  console.log('\n✅ Lead updated!')
  console.log('   Sales Rep: Tyler (will receive notifications)')
  console.log('   Marketing Rep: Jonathan (can create notes)')
  
  console.log('\n📝 Testing Instructions:')
  console.log('=' .repeat(60))
  console.log(`1. Go to: http://localhost:3000/admin/leads/${lead.id}`)
  console.log('2. Add a new note using the "Add Activity" button')
  console.log('3. Check Tyler\'s email:', tyler.email)
  console.log('4. Check in-app notifications for Tyler')
  console.log('')
  console.log('Expected Results:')
  console.log('   ✅ Tyler receives email notification')
  console.log('   ✅ Tyler sees in-app notification')
  console.log('   ❌ Jonathan does NOT receive notification (he created it)')
  console.log('')
  console.log('To test Jonathan receiving notifications:')
  console.log('   - Have Tyler log in and add a note')
  console.log('   - OR assign lead to Jonathan and have someone else add a note')
}

setupTestLead().catch(console.error)
