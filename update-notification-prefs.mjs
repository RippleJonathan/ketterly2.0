/**
 * Update user notification preferences to include all new keys
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

async function updateNotificationPreferences() {
  console.log('⚙️  Updating Notification Preferences')
  console.log('=' .repeat(60))
  
  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'jonathan@rippleroofs.com')
    .single()
  
  console.log('✅ User:', user.email)
  
  const currentPrefs = user.notification_preferences || {}
  console.log('\n📋 Current preferences:', Object.keys(currentPrefs).length, 'keys')
  
  // All notification preference keys
  const allKeys = {
    // Leads & Customers
    new_leads: true,
    new_note: true,
    lead_assigned: true,
    lead_status_change: true,
    
    // Schedule & Appointments
    appointment_scheduled: true,
    appointment_reminders: true,
    appointments: true, // Old key, keep for compatibility
    
    // Sales & Quotes
    quote_sent: true,
    quote_approved: true,
    quotes_sent: true, // Old key
    quotes_approved: true, // Old key
    contract_signed: true,
    contracts_signed: true, // Old key
    
    // Financial
    invoice_overdue: true,
    invoices_paid: true,
    payments_received: true,
    
    // Production & Projects
    production_scheduled: true,
    project_updates: true,
    
    // Tasks & Messages (not implemented yet)
    tasks: true,
    task_due_soon: true,
    messages: true,
    
    // Reports (not implemented yet)
    daily_summary: true,
    weekly_report: true,
  }
  
  const newKeys = Object.keys(allKeys).filter(key => !(key in currentPrefs))
  
  console.log('\n🆕 New keys to add:', newKeys.length)
  newKeys.forEach(key => console.log(`   + ${key}`))
  
  const updatedPrefs = { ...currentPrefs, ...allKeys }
  
  console.log('\n💾 Updating preferences...')
  const { error } = await supabase
    .from('users')
    .update({ notification_preferences: updatedPrefs })
    .eq('id', user.id)
  
  if (error) {
    console.error('❌ Failed to update:', error)
    return
  }
  
  console.log('✅ Preferences updated successfully!')
  console.log(`\n📊 Total preference keys: ${Object.keys(updatedPrefs).length}`)
  
  // Show all keys grouped
  console.log('\n📋 All Notification Preferences:')
  console.log('\n   Leads & Customers:')
  console.log('   ✓ new_leads')
  console.log('   ✓ new_note')
  console.log('   ✓ lead_assigned')
  console.log('   ✓ lead_status_change')
  
  console.log('\n   Schedule & Appointments:')
  console.log('   ✓ appointment_scheduled')
  console.log('   ✓ appointment_reminders')
  
  console.log('\n   Sales & Quotes:')
  console.log('   ✓ quote_sent')
  console.log('   ✓ quote_approved')
  console.log('   ✓ contract_signed')
  
  console.log('\n   Financial:')
  console.log('   ✓ invoice_overdue')
  console.log('   ✓ invoices_paid')
  console.log('   ✓ payments_received')
  
  console.log('\n   Production:')
  console.log('   ✓ production_scheduled')
  console.log('   ✓ project_updates')
  
  console.log('\n   Future Features:')
  console.log('   ✓ tasks (not yet implemented)')
  console.log('   ✓ messages (not yet implemented)')
  console.log('   ✓ daily_summary (not yet implemented)')
}

updateNotificationPreferences().catch(console.error)
