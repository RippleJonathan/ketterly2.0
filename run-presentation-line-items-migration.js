/**
 * Run the presentation deck line items migration
 * This adds line items to the get_presentation_deck function
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running presentation deck line items migration...\n')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'add_line_items_to_presentation_deck.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration file loaded successfully')
    console.log('📝 SQL Preview:')
    console.log(migrationSQL.substring(0, 200) + '...\n')

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!\n')
    console.log('📊 The get_presentation_deck function now includes quote line items')
    console.log('🎯 Next steps:')
    console.log('   1. Test the presentation by clicking "Present" on a quote')
    console.log('   2. Navigate to the pricing slide')
    console.log('   3. Verify that actual line items appear instead of mock data\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()
