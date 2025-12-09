/**
 * Migration Runner for Adding Variant Support to Order Items
 * 
 * This script runs the migration to add variant_id, material_id, and variant_name
 * columns to the material_order_items table.
 * 
 * Usage: node add-variant-to-order-items.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 Running migration: Add variant support to order items...\n')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241209000002_add_variant_to_order_items.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration SQL:')
    console.log('─'.repeat(60))
    console.log(migrationSQL)
    console.log('─'.repeat(60))
    console.log()

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('❌ Migration failed:', error.message)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('\n📋 Changes applied:')
    console.log('  • Added material_id column to material_order_items')
    console.log('  • Added variant_id column to material_order_items')
    console.log('  • Added variant_name column to material_order_items')
    console.log('  • Created indexes for faster lookups')
    console.log('\n🎉 You can now select variants when adding/editing order items!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

runMigration()
