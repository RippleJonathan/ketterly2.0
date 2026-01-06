// Check what columns exist in lead_commissions table

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkColumns() {
  console.log('\n🔍 Checking lead_commissions table columns...\n')

  try {
    // Try a simple query to see what happens
    const { data: sample, error: sampleError } = await supabase
      .from('lead_commissions')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.log('❌ Sample query error:', sampleError.message)
      return
    }

    if (sample && sample.length > 0) {
      console.log('✅ Sample commission record columns:')
      const columns = Object.keys(sample[0])
      columns.forEach(col => {
        console.log(`  - ${col}`)
      })

      // Check if triggered_by_payment_id exists
      const hasTriggeredColumn = columns.includes('triggered_by_payment_id')
      console.log(`\n🔍 triggered_by_payment_id column: ${hasTriggeredColumn ? '✅ EXISTS' : '❌ MISSING'}`)

      if (!hasTriggeredColumn) {
        console.log('\n❌ The triggered_by_payment_id column is missing!')
        console.log('This means the commission enhancements migration hasn\'t been run.')
        console.log('Run: supabase/migrations/20260104000001_commission_enhancements.sql')
      }
    } else {
      console.log('ℹ️  No commission records found (table might be empty)')
    }

  } catch (err) {
    console.log('❌ Unexpected error:', err.message)
  }
}

checkColumns()
