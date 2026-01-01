/**
 * Run Locations Multi-Tenant Migration
 * 
 * This script runs the locations feature migration which adds:
 * - locations table (branches/offices)
 * - location_material_pricing (cost overrides)
 * - location_labor_rates (rate overrides)
 * - location_users (team assignments)
 * - Updates leads, quotes, orders with location_id
 * - RLS policies for all new tables
 * 
 * Usage: node run-locations-migration.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Running locations multi-tenant migration...\n')

    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241230000001_locations_multi_tenant.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration file loaded')
    console.log('📊 Executing SQL...\n')

    // Execute migration using exec_sql RPC function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error.message)
      console.error('\nError details:', error)
      process.exit(1)
    }

    console.log('✅ Migration executed successfully!\n')
    console.log('📋 Created:')
    console.log('  - locations table')
    console.log('  - location_material_pricing table')
    console.log('  - location_labor_rates table')
    console.log('  - location_users table')
    console.log('  - Added location_id to leads, quotes, material_orders, work_orders, calendar_events')
    console.log('  - Added default_location_id to users')
    console.log('  - RLS policies for all location tables')
    console.log('  - Helper function: get_material_cost()')
    console.log('\n🎉 Locations feature is ready to use!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

runMigration()
