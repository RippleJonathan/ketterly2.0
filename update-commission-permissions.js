/**
 * Update permissions for sales reps, marketing reps, and sales managers
 * to have can_view_own_commissions and can_view_all_commissions
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateCommissionPermissions() {
  console.log('🔍 Fetching users with sales, marketing, or sales_manager roles...')

  // Get all users with these roles
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, full_name')
    .in('role', ['sales', 'sales_rep', 'marketing', 'marketing_rep', 'sales_manager'])

  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }

  console.log(`✅ Found ${users.length} users to update`)

  for (const user of users) {
    console.log(`\n📝 Updating: ${user.full_name} (${user.email}) - Role: ${user.role}`)

    // Determine permissions based on role
    const isManager = user.role === 'sales_manager'
    const permissions = {
      can_view_own_commissions: true,
      can_view_all_commissions: isManager, // Only sales managers can view all
    }

    // Update user_permissions
    const { error: updateError } = await supabase
      .from('user_permissions')
      .update(permissions)
      .eq('user_id', user.id)

    if (updateError) {
      console.error(`   ❌ Failed to update ${user.email}:`, updateError.message)
    } else {
      console.log(`   ✅ Updated permissions: can_view_own_commissions=true, can_view_all_commissions=${isManager}`)
    }
  }

  console.log('\n✅ Commission permissions update complete!')
}

updateCommissionPermissions()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })
