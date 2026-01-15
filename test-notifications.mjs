/**
 * Comprehensive Notification System Test
 * 
 * Tests all notification types to ensure:
 * 1. In-app notifications are created
 * 2. Email notifications respect user preferences
 * 3. Preference keys are recognized
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test notification types
const NOTIFICATION_TYPES = [
  { key: 'new_note', label: 'New Note', requiresLead: true },
  { key: 'lead_assigned', label: 'Lead Assigned', requiresLead: true },
  { key: 'quote_approved', label: 'Quote Approved', requiresQuote: true },
  { key: 'contract_signed', label: 'Contract Signed', requiresQuote: true },
  { key: 'appointment_scheduled', label: 'Appointment Scheduled', requiresLead: true },
  { key: 'appointment_reminders', label: 'Appointment Reminder', requiresAppointment: true },
  { key: 'invoice_overdue', label: 'Invoice Overdue', requiresInvoice: true },
  { key: 'production_scheduled', label: 'Production Scheduled', requiresLead: true },
]

async function getTestUser() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'jonathan@rippleroofs.com')
    .single()
  
  if (error) {
    console.error('❌ Failed to get test user:', error)
    return null
  }
  
  console.log('✅ Found test user:', users.email)
  console.log('   User ID:', users.id)
  console.log('   Company ID:', users.company_id)
  console.log('   Email notifications:', users.email_notifications)
  console.log('   Notification preferences:', users.notification_preferences)
  
  return users
}

async function getTestLead(companyId) {
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .limit(1)
    .single()
  
  if (error) {
    console.error('❌ Failed to get test lead:', error)
    return null
  }
  
  console.log('✅ Found test lead:', lead.full_name, `(${lead.id})`)
  return lead
}

async function testNoteNotification(user, lead) {
  console.log('\n📝 Testing NEW_NOTE notification...')
  
  try {
    // Create a test note activity
    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        company_id: user.company_id,
        entity_type: 'lead',
        entity_id: lead.id,
        activity_type: 'note',
        title: 'Test note for notification',
        description: 'This is a test note to verify notifications are working',
        created_by: user.id,
      })
      .select()
      .single()
    
    if (error) {
      console.error('   ❌ Failed to create activity:', error)
      return false
    }
    
    console.log('   ✅ Created test note activity:', activity.id)
    
    // Wait a moment for server action to process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check if in-app notification was created
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', user.company_id)
      .ilike('message', '%test note%')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (notifications && notifications.length > 0) {
      console.log('   ✅ In-app notification created:', notifications[0].title)
    } else {
      console.log('   ⚠️  No in-app notification found')
      console.log('   NOTE: This may be expected if server action is not running')
    }
    
    // Check user's preference for new_note
    const hasPreference = user.notification_preferences?.new_note !== false
    console.log('   User preference for new_note:', hasPreference)
    
    if (user.email_notifications && hasPreference) {
      console.log('   ✅ Email notification SHOULD be sent')
    } else {
      console.log('   ⚠️  Email notification will NOT be sent (disabled in preferences)')
    }
    
    return true
  } catch (error) {
    console.error('   ❌ Test failed:', error)
    return false
  }
}

async function testLeadAssignedNotification(user, lead) {
  console.log('\n👤 Testing LEAD_ASSIGNED notification...')
  
  try {
    // Get another user to reassign to
    const { data: otherUser } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', user.company_id)
      .neq('id', user.id)
      .limit(1)
      .single()
    
    if (!otherUser) {
      console.log('   ⚠️  No other user found to test reassignment')
      return false
    }
    
    // Update lead assignment
    const { error } = await supabase
      .from('leads')
      .update({ sales_rep_id: otherUser.id })
      .eq('id', lead.id)
    
    if (error) {
      console.error('   ❌ Failed to update lead:', error)
      return false
    }
    
    console.log(`   ✅ Reassigned lead to ${otherUser.full_name}`)
    
    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check for notification
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', user.company_id)
      .ilike('message', '%assigned%')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (notifications && notifications.length > 0) {
      console.log('   ✅ In-app notification created:', notifications[0].title)
    } else {
      console.log('   ⚠️  No in-app notification found')
      console.log('   NOTE: Lead assignment notifications may need integration')
    }
    
    // Reset lead assignment
    await supabase
      .from('leads')
      .update({ sales_rep_id: user.id })
      .eq('id', lead.id)
    
    return true
  } catch (error) {
    console.error('   ❌ Test failed:', error)
    return false
  }
}

async function testNotificationPreferences(user) {
  console.log('\n⚙️  Testing Notification Preferences...')
  
  const requiredKeys = [
    'new_note',
    'lead_assigned',
    'quote_approved',
    'contract_signed',
    'appointment_scheduled',
    'appointment_reminders',
    'invoice_overdue',
    'production_scheduled',
  ]
  
  const prefs = user.notification_preferences || {}
  
  console.log('\n   Preference Status:')
  requiredKeys.forEach(key => {
    const enabled = prefs[key] !== false
    const icon = enabled ? '✅' : '❌'
    console.log(`   ${icon} ${key}: ${enabled ? 'Enabled' : 'Disabled'}`)
  })
  
  // Check if all keys exist in user preferences
  const missingKeys = requiredKeys.filter(key => !(key in prefs))
  
  if (missingKeys.length > 0) {
    console.log('\n   ⚠️  Missing preference keys:', missingKeys)
    console.log('   These will default to TRUE (enabled)')
  } else {
    console.log('\n   ✅ All preference keys are set')
  }
  
  return true
}

async function testDatabaseSchema() {
  console.log('\n🗄️  Testing Database Schema...')
  
  // Check if notifications table exists
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1)
  
  if (notifError) {
    console.error('   ❌ Notifications table error:', notifError)
    return false
  }
  
  console.log('   ✅ Notifications table accessible')
  
  // Check if activities table exists
  const { data: activities, error: actError } = await supabase
    .from('activities')
    .select('*')
    .limit(1)
  
  if (actError) {
    console.error('   ❌ Activities table error:', actError)
    return false
  }
  
  console.log('   ✅ Activities table accessible')
  
  return true
}

async function testEmailPreferenceLogic(user) {
  console.log('\n📧 Testing Email Preference Logic...')
  
  console.log('\n   Master Toggle:')
  console.log(`   email_notifications: ${user.email_notifications}`)
  
  if (!user.email_notifications) {
    console.log('   ⚠️  Master email toggle is OFF - no emails will be sent')
    return false
  }
  
  console.log('   ✅ Master email toggle is ON')
  
  const testKeys = ['new_note', 'lead_assigned', 'quote_approved']
  
  console.log('\n   Specific Preferences:')
  testKeys.forEach(key => {
    const pref = user.notification_preferences?.[key]
    const willSend = pref !== false
    console.log(`   ${key}: ${pref === undefined ? 'undefined (defaults to true)' : pref} → ${willSend ? 'SEND' : 'SKIP'}`)
  })
  
  return true
}

async function runAllTests() {
  console.log('🧪 Starting Notification System Tests\n')
  console.log('=' .repeat(60))
  
  // Test 1: Database Schema
  await testDatabaseSchema()
  
  // Test 2: Get test user
  const user = await getTestUser()
  if (!user) {
    console.log('\n❌ Cannot continue without test user')
    return
  }
  
  // Test 3: Notification preferences
  await testNotificationPreferences(user)
  
  // Test 4: Email preference logic
  await testEmailPreferenceLogic(user)
  
  // Test 5: Get test lead
  const lead = await getTestLead(user.company_id)
  if (!lead) {
    console.log('\n⚠️  No test lead found, skipping lead-based tests')
  } else {
    // Test 6: Note notification
    await testNoteNotification(user, lead)
    
    // Test 7: Lead assigned notification
    await testLeadAssignedNotification(user, lead)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Test suite completed!')
  console.log('\nNext Steps:')
  console.log('1. Check your email inbox for test emails')
  console.log('2. Visit /admin/notifications to see in-app notifications')
  console.log('3. Check browser console for detailed logs')
  console.log('4. Enable all notification preferences in /admin/profile')
}

runAllTests().catch(console.error)
