// Quick script to check if materials table exists with correct columns
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkMaterialsTable() {
  console.log('🔍 Checking materials table structure...\n')

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error querying materials table:', error.message)
      console.error('Error code:', error.code)
      console.error('\n💡 This likely means:')
      console.error('   1. Table does not exist in database')
      console.error('   2. Migration has not been run yet')
      console.error('   3. Schema cache needs to be reloaded\n')
      return
    }

    console.log('✅ Materials table exists!')
    console.log('📊 Row count:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('📋 Sample data:', JSON.stringify(data[0], null, 2))
    } else {
      console.log('📋 Table is empty (no materials created yet)')
    }

    // Try to get table metadata via RPC
    const { data: tableInfo, error: metaError } = await supabase
      .rpc('exec_sql', { 
        sql_string: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = 'materials'
          ORDER BY ordinal_position;
        `
      })

    if (!metaError && tableInfo) {
      console.log('\n📋 Table columns:')
      tableInfo.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`)
      })
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

checkMaterialsTable()
