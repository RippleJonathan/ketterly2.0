/**
 * Fix Presentation Deck Function
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixFunction() {
  console.log('🔧 Fixing get_presentation_deck function...\n')

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', 'fix_presentation_deck_function.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📝 Running SQL migration...')
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Error:', error.message)
      console.log('\n💡 Trying direct execution via service role...')
      
      // If exec_sql doesn't work, we'll need to run it manually
      console.log('\n📋 Please run this SQL in your Supabase Dashboard SQL Editor:')
      console.log('=' .repeat(80))
      console.log(sql)
      console.log('=' .repeat(80))
      return
    }

    console.log('✅ Function fixed successfully!')
    console.log('\nNow refresh your browser and try the presentation again.')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

fixFunction()
