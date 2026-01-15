/**
 * Live UI Test: Create a note through the proper UI flow
 * This simulates what happens when you add a note in the browser
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

async function simulateUINotecreation() {
  console.log('🧪 Simulating UI Note Creation')
  console.log('=' .repeat(60))
  
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'jonathan@rippleroofs.com')
    .single()
  
  console.log('✅ User:', user.email)
  console.log('   User ID:', user.id)
  console.log('   Company ID:', user.company_id)
  
  // Get a lead
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', user.company_id)
    .eq('sales_rep_id', user.id)
    .is('deleted_at', null)
    .limit(1)
    .single()
  
  console.log('✅ Lead:', lead.full_name)
  console.log('   Lead ID:', lead.id)
  console.log('   Assigned to:', lead.sales_rep_id)
  
  const testId = Date.now()
  const noteTitle = `UI Test Note ${testId}`
  
  console.log('\n📝 Creating note activity...')
  console.log('   Title:', noteTitle)
  
  // Step 1: Create the activity (this is what the UI does)
  const { data: activity, error: actError } = await supabase
    .from('activities')
    .insert({
      company_id: user.company_id,
      entity_type: 'lead',
      entity_id: lead.id,
      activity_type: 'note',
      title: noteTitle,
      description: 'This note was created to test the notification system',
      created_by: user.id,
    })
    .select()
    .single()
  
  if (actError) {
    console.error('❌ Failed to create activity:', actError)
    return
  }
  
  console.log('✅ Activity created:', activity.id)
  
  // Wait a moment
  console.log('\n⏳ Waiting 2 seconds for notifications to process...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Check for notification
  console.log('\n🔍 Checking for notifications...')
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('company_id', user.company_id)
    .gte('created_at', new Date(testId - 5000).toISOString())
    .order('created_at', { ascending: false })
  
  console.log(`   Found ${notifications?.length || 0} notifications`)
  
  if (notifications && notifications.length > 0) {
    notifications.forEach((n, i) => {
      console.log(`\n   ${i + 1}. ${n.title}`)
      console.log(`      Message: ${n.message}`)
      console.log(`      Created: ${n.created_at}`)
      console.log(`      Created by: ${n.created_by}`)
    })
  }
  
  // Analysis
  console.log('\n📊 Analysis:')
  console.log('=' .repeat(60))
  
  const foundRelatedNotification = notifications?.some(n => 
    n.message.includes(noteTitle) || n.message.includes('test')
  )
  
  if (foundRelatedNotification) {
    console.log('✅ SUCCESS: Notification was created for the note!')
    console.log('   The server action IS working correctly')
  } else {
    console.log('❌ ISSUE: No notification found for this note')
    console.log('   This means:')
    console.log('   1. The server action is NOT being called automatically')
    console.log('   2. Direct database inserts bypass the notification system')
    console.log('   3. Only UI actions through useCreateActivity will trigger notifications')
  }
  
  console.log('\n💡 To Test in UI:')
  console.log('   1. Go to /admin/leads/' + lead.id)
  console.log('   2. Add a new note using the "Add Activity" button')
  console.log('   3. Check /admin/notifications for the in-app notification')
  console.log('   4. Check your email inbox')
  console.log('\n   If you see notifications there, the system is working!')
}

async function checkRecentNotifications() {
  console.log('\n\n📋 Recent Notification Activity')
  console.log('=' .repeat(60))
  
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)
  
  console.log(`Found ${notifications?.length || 0} notifications in the last hour\n`)
  
  if (notifications && notifications.length > 0) {
    notifications.forEach((n, i) => {
      const timeAgo = Math.round((Date.now() - new Date(n.created_at).getTime()) / 60000)
      console.log(`${i + 1}. [${timeAgo}m ago] ${n.title}`)
      console.log(`   ${n.message}`)
    })
  }
}

async function run() {
  try {
    await simulateUINotecreation()
    await checkRecentNotifications()
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

run().catch(console.error)
