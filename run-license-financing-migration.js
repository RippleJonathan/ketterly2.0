const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('📦 Reading migration file...')
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241227000001_add_license_and_financing.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🚀 Running migration: add_license_and_financing...')
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('📝 Added columns:')
    console.log('   - license_number')
    console.log('   - financing_option_1_name, financing_option_1_months, financing_option_1_apr, financing_option_1_enabled')
    console.log('   - financing_option_2_name, financing_option_2_months, financing_option_2_apr, financing_option_2_enabled')
    console.log('   - financing_option_3_name, financing_option_3_months, financing_option_3_apr, financing_option_3_enabled')
    console.log('')
    console.log('🎉 You can now use the license number and financing options in company settings!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

runMigration()
