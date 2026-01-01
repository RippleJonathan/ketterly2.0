/**
 * Run Supplier Material Pricing Migration
 * 
 * Adds supplier_material_pricing table to enable location-specific
 * supplier pricing for materials.
 * 
 * Usage: node run-supplier-pricing-migration.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
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
    console.log('🚀 Starting supplier material pricing migration...\n')
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241231000001_add_supplier_material_pricing.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration file loaded')
    console.log('📍 Path:', migrationPath)
    console.log('📏 Size:', migrationSQL.length, 'bytes\n')
    
    // Execute migration using exec_sql RPC function
    console.log('⚙️  Executing migration via exec_sql...\n')
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: migrationSQL
    })
    
    if (error) {
      console.error('❌ Migration failed!')
      console.error('Error:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration executed successfully!\n')
    
    // Verify table was created
    console.log('🔍 Verifying table creation...')
    const { data: tables, error: tableError } = await supabase
      .from('supplier_material_pricing')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('⚠️  Warning: Could not verify table creation')
      console.error('Error:', tableError)
    } else {
      console.log('✅ Table verified: supplier_material_pricing exists\n')
    }
    
    console.log('🎉 Supplier material pricing migration complete!\n')
    console.log('📋 Next steps:')
    console.log('   1. Test creating supplier-specific pricing')
    console.log('   2. Verify RLS policies work correctly')
    console.log('   3. Update UI to manage supplier pricing\n')
    
  } catch (err) {
    console.error('❌ Unexpected error during migration:')
    console.error(err)
    process.exit(1)
  }
}

runMigration()
