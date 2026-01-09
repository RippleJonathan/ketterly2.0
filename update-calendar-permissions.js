/**
 * Update Calendar Permissions for Sales/Marketing Reps
 * 
 * This script ensures sales reps, marketing reps, and sales managers have
 * the proper calendar permissions to schedule consultations and events.
 * 
 * Run with: node update-calendar-permissions.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function updateCalendarPermissions() {
  console.log('🔄 Updating calendar permissions for sales/marketing roles...\n')

  try {
    // Get all users with sales/marketing roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, role')
      .in('role', ['sales', 'sales_rep', 'sales_manager', 'marketing', 'marketing_rep'])
      .is('deleted_at', null)

    if (usersError) throw usersError

    console.log(`📋 Found ${users.length} users with sales/marketing roles\n`)

    // Update permissions for each user
    for (const user of users) {
      console.log(`  Processing: ${user.full_name} (${user.role})`)

      const permissionsToSet = {
        // Calendar permissions
        can_view_calendar: true,
        can_create_consultations: true,
        can_create_production_events: user.role === 'sales_manager', // Only managers
        can_edit_all_events: user.role === 'sales_manager', // Only managers
      }

      const { error: updateError } = await supabase
        .from('user_permissions')
        .update(permissionsToSet)
        .eq('user_id', user.id)

      if (updateError) {
        console.error(`    ❌ Failed: ${updateError.message}`)
      } else {
        console.log(`    ✅ Updated successfully`)
      }
    }

    console.log('\n✅ Calendar permissions update complete!')
    console.log('\nPermissions set:')
    console.log('  • can_view_calendar: true (all)')
    console.log('  • can_create_consultations: true (all)')
    console.log('  • can_create_production_events: true (managers only)')
    console.log('  • can_edit_all_events: true (managers only)')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

updateCalendarPermissions()
