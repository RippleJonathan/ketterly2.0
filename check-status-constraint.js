// Check the current status constraint for lead_commissions

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStatusConstraint() {
  console.log('\n🔍 Checking if \'eligible\' status is allowed...\n')

  try {
    // Test if 'eligible' status is allowed by trying to update an existing commission
    const { data: commissions } = await supabase
      .from('lead_commissions')
      .select('id, status')
      .limit(1)

    if (!commissions || commissions.length === 0) {
      console.log('❌ No commissions found to test with')
      return
    }

    const testCommission = commissions[0]
    console.log(`Testing with commission ID: ${testCommission.id} (current status: ${testCommission.status})`)

    // Try to update to 'eligible' status
    const { error: updateError } = await supabase
      .from('lead_commissions')
      .update({ status: 'eligible' })
      .eq('id', testCommission.id)

    if (updateError) {
      console.log('❌ Update to \'eligible\' failed:', updateError.message)
      if (updateError.message.includes('check constraint')) {
        console.log('❌ \'eligible\' status is NOT allowed by the constraint')
        console.log('\n🔧 Need to update the CHECK constraint to include \'eligible\'')
      }
    } else {
      console.log('✅ \'eligible\' status is allowed!')
      // Revert the change
      await supabase
        .from('lead_commissions')
        .update({ status: testCommission.status })
        .eq('id', testCommission.id)
      console.log('Reverted test change')
    }

  } catch (err) {
    console.log('❌ Unexpected error:', err.message)
  }
}

checkStatusConstraint()
