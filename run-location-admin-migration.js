/**
 * Migration Runner for Location Admin User Creation Permissions
 * 
 * This script applies the migration to allow location_admin users to manage
 * users within their assigned locations.
 * 
 * Usage:
 *   node run-location-admin-migration.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('📁 Reading migration file...')
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241230000002_location_admin_user_creation.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('🚀 Executing migration...')
    console.log('Migration content:')
    console.log('─'.repeat(80))
    console.log(migrationSQL)
    console.log('─'.repeat(80))

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('\n📋 Summary:')
    console.log('  - Updated users UPDATE policy to allow location admins')
    console.log('  - Updated users DELETE policy to allow location admins')
    console.log('  - Location admins can now manage users in their assigned locations')
    console.log('\n🎯 Next steps:')
    console.log('  1. Test creating a user as a location_admin')
    console.log('  2. Verify location managers only see their team members')
    console.log('  3. Test that company admins still have full access')

  } catch (err) {
    console.error('❌ Error running migration:', err)
    process.exit(1)
  }
}

runMigration()
