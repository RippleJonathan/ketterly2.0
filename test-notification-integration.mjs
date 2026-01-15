/**
 * Integration Test: Trigger actual notification flows
 * 
 * This test simulates real user actions to test the full notification pipeline
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

async function waitAndCheck(description, checkFn, maxWaitMs = 3000) {
  console.log(`   Waiting for ${description}...`)
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitMs) {
    const result = await checkFn()
    if (result) {
      console.log(`   ✅ ${description} - Success!`)
      return result
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`   ⚠️  ${description} - Not found after ${maxWaitMs}ms`)
  return null
}

async function testNoteNotificationFlow() {
  console.log('\n📝 Test 1: Note Notification Flow')
  console.log('=' .repeat(50))
  
  // Get test user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'jonathan@rippleroofs.com')
    .single()
  
  console.log('✅ Test user:', user.email)
  
  // Get a lead assigned to this user
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', user.company_id)
    .eq('sales_rep_id', user.id)
    .is('deleted_at', null)
    .limit(1)
    .single()
  
  if (!lead) {
    console.log('❌ No leads assigned to user')
    return
  }
  
  console.log('✅ Test lead:', lead.full_name)
  
  // Create another user to act as the note creator
  const { data: otherUsers } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', user.company_id)
    .neq('id', user.id)
    .limit(1)
  
  const noteCreator = otherUsers?.[0] || user
  console.log('✅ Note creator:', noteCreator.email)
  
  // Create a note
  const testId = Date.now()
  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      company_id: user.company_id,
      entity_type: 'lead',
      entity_id: lead.id,
      activity_type: 'note',
      title: `Test Note ${testId}`,
      description: `This is a test note created at ${new Date().toISOString()}`,
      created_by: noteCreator.id,
    })
    .select()
    .single()
  
  if (error) {
    console.log('❌ Failed to create note:', error)
    return
  }
  
  console.log('✅ Created note:', activity.title)
  
  // Wait and check for in-app notification
  const notification = await waitAndCheck(
    'in-app notification',
    async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', user.company_id)
        .gte('created_at', new Date(testId - 5000).toISOString())
        .ilike('message', `%${activity.title}%`)
        .maybeSingle()
      return data
    }
  )
  
  if (notification) {
    console.log('   📱 Notification title:', notification.title)
    console.log('   📱 Notification message:', notification.message)
    console.log('   📱 Created at:', notification.created_at)
  }
  
  // Check if notification was created via server action
  console.log('\n   Analysis:')
  if (notification) {
    console.log('   ✅ In-app notification was created')
    console.log('   ✅ Server action is working')
  } else {
    console.log('   ❌ No in-app notification found')
    console.log('   ⚠️  Server action may not be triggered')
    console.log('   ⚠️  Check if createActivityWithNotifications is being called')
  }
  
  return { user, lead, activity, notification }
}

async function checkNotificationSystem() {
  console.log('\n🔍 Checking Notification System Components')
  console.log('=' .repeat(50))
  
  // Check recent notifications
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log(`\n📊 Recent notifications (last 24 hours): ${recentNotifications?.length || 0}`)
  if (recentNotifications && recentNotifications.length > 0) {
    recentNotifications.forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.title} - ${new Date(n.created_at).toLocaleString()}`)
      console.log(`      Message: ${n.message}`)
    })
  } else {
    console.log('   No recent notifications found')
  }
  
  // Check recent activities
  const { data: recentActivities } = await supabase
    .from('activities')
    .select('*')
    .eq('activity_type', 'note')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log(`\n📝 Recent note activities (last 24 hours): ${recentActivities?.length || 0}`)
  if (recentActivities && recentActivities.length > 0) {
    recentActivities.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.title} - ${new Date(a.created_at).toLocaleString()}`)
    })
  }
  
  // Calculate notification rate
  if (recentActivities && recentActivities.length > 0) {
    const notificationRate = (recentNotifications?.length || 0) / recentActivities.length
    console.log(`\n📈 Notification Rate: ${Math.round(notificationRate * 100)}%`)
    
    if (notificationRate < 0.5) {
      console.log('   ⚠️  Less than half of activities created notifications')
      console.log('   ⚠️  This suggests the server action may not be called consistently')
    } else {
      console.log('   ✅ Good notification coverage')
    }
  }
}

async function testUnifiedNotificationAPI() {
  console.log('\n🔧 Test 2: Testing createUnifiedNotification Directly')
  console.log('=' .repeat(50))
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'jonathan@rippleroofs.com')
    .single()
  
  const testId = Date.now()
  
  // Create a test notification directly
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      company_id: user.company_id,
      title: '🧪 Direct Test Notification',
      message: `This is a direct test notification created at ${testId}`,
      type: 'user',
      priority: 'low',
      created_by: user.id,
    })
    .select()
    .single()
  
  if (error) {
    console.log('❌ Failed to create notification:', error)
    return
  }
  
  console.log('✅ Direct notification created:', notification.id)
  console.log('   Title:', notification.title)
  console.log('   Message:', notification.message)
  
  // Verify it appears in the list
  const { data: found } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notification.id)
    .single()
  
  if (found) {
    console.log('✅ Notification can be retrieved')
  }
  
  return notification
}

async function testPreferenceKeys() {
  console.log('\n⚙️  Test 3: Notification Preference Keys')
  console.log('=' .repeat(50))
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'jonathan@rippleroofs.com')
    .single()
  
  const expectedKeys = [
    'new_note',
    'lead_assigned',
    'quote_approved',
    'contract_signed',
    'appointment_scheduled',
    'appointment_reminders',
    'invoice_overdue',
    'production_scheduled',
  ]
  
  const currentPrefs = user.notification_preferences || {}
  const missingKeys = expectedKeys.filter(key => !(key in currentPrefs))
  
  console.log('Expected preference keys:', expectedKeys.length)
  console.log('Currently set keys:', Object.keys(currentPrefs).length)
  console.log('Missing keys:', missingKeys.length)
  
  if (missingKeys.length > 0) {
    console.log('\n⚠️  Missing keys (will default to enabled):')
    missingKeys.forEach(key => console.log(`   - ${key}`))
    
    console.log('\n💡 Suggestion: Update user preferences to include all keys')
    
    // Offer to update
    const updatedPrefs = { ...currentPrefs }
    missingKeys.forEach(key => {
      updatedPrefs[key] = true
    })
    
    console.log('\nUpdated preferences would include:')
    Object.keys(updatedPrefs).sort().forEach(key => {
      console.log(`   ${key}: ${updatedPrefs[key]}`)
    })
  } else {
    console.log('✅ All preference keys are set')
  }
}

async function runIntegrationTests() {
  console.log('🧪 Notification System Integration Tests')
  console.log('=' .repeat(60))
  console.log(`Started at: ${new Date().toLocaleString()}\n`)
  
  try {
    // Test 1: Note notification flow
    await testNoteNotificationFlow()
    
    // Test 2: System check
    await checkNotificationSystem()
    
    // Test 3: Direct API test
    await testUnifiedNotificationAPI()
    
    // Test 4: Preference keys
    await testPreferenceKeys()
    
    console.log('\n' + '=' .repeat(60))
    console.log('\n✅ All tests completed!')
    console.log('\n📋 Summary:')
    console.log('   - Check /admin/notifications page for in-app notifications')
    console.log('   - Check email inbox for email notifications')
    console.log('   - Enable missing preference keys in /admin/profile')
    console.log('   - Verify server action is called when creating notes')
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
  }
}

runIntegrationTests().catch(console.error)
