/**
 * Fix missing user_permissions records
 * Ensures all users have a permissions record with default values
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixMissingPermissions() {
  console.log('🔍 Checking for users without permissions records...\n')

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, full_name')
    .is('deleted_at', null)

  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }

  console.log(`Found ${users.length} active users\n`)

  // Check each user for permissions record
  for (const user of users) {
    const { data: permissions, error: permError } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (permError && permError.code === 'PGRST116') {
      // No record found - create one
      console.log(`⚠️  Missing permissions for: ${user.full_name} (${user.email})`)
      console.log(`   Role: ${user.role}`)
      
      // Determine tab permissions based on role
      const isMarketing = user.role === 'marketing'
      
      // Create permissions record with tab permissions
      const { error: insertError } = await supabase
        .from('user_permissions')
        .insert({
          user_id: user.id,
          // Tab permissions (all true except Marketing role specific restrictions)
          can_view_lead_details: true,
          can_view_lead_checklist: true,
          can_view_lead_measurements: true,
          can_view_lead_estimates: true,
          can_view_lead_orders: !isMarketing,
          can_view_lead_photos: true,
          can_view_lead_notes: true,
          can_view_lead_documents: true,
          can_view_lead_payments: !isMarketing,
          can_view_lead_financials: !isMarketing,
          can_view_lead_commissions: !isMarketing
        })

      if (insertError) {
        console.error(`   ❌ Failed to create permissions:`, insertError.message)
      } else {
        console.log(`   ✅ Created permissions record with tab defaults\n`)
      }
    } else if (permError) {
      console.error(`❌ Error checking permissions for ${user.email}:`, permError)
    } else {
      console.log(`✅ ${user.full_name} (${user.email}) - has permissions`)
    }
  }

  console.log('\n✅ Done checking all users')
}

fixMissingPermissions()
  .catch(console.error)
