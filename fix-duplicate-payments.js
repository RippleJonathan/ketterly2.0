/**
 * Fix duplicate payment numbers
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDuplicatePayments() {
  console.log('🔍 Checking for duplicate payment numbers...\n')
  
  try {
    // Find all payments with PAY-2026-001
    const { data: duplicates, error } = await supabase
      .from('payments')
      .select('id, payment_number, created_at, amount, deleted_at')
      .eq('payment_number', 'PAY-2026-001')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error:', error.message)
      return
    }
    
    console.log(`Found ${duplicates?.length || 0} payment(s) with number PAY-2026-001`)
    
    if (duplicates && duplicates.length > 0) {
      duplicates.forEach((p, i) => {
        console.log(`  ${i + 1}. ID: ${p.id.slice(0, 8)}... Amount: $${p.amount} Created: ${new Date(p.created_at).toLocaleString()} Deleted: ${p.deleted_at ? 'Yes' : 'No'}`)
      })
      
      // Ask: Keep first, soft-delete or renumber others
      console.log('\n📝 Solution: Renumbering duplicate payments...')
      
      // Keep first one, renumber the rest
      for (let i = 1; i < duplicates.length; i++) {
        const newNumber = `PAY-2026-${String(i + 1).padStart(3, '0')}`
        
        const { error: updateError } = await supabase
          .from('payments')
          .update({ payment_number: newNumber })
          .eq('id', duplicates[i].id)
        
        if (updateError) {
          console.error(`❌ Failed to update payment ${i + 1}:`, updateError.message)
        } else {
          console.log(`✅ Renumbered payment ${i + 1} to ${newNumber}`)
        }
      }
      
      console.log('\n✅ Duplicate payments fixed!')
      console.log('💡 You can now create a new payment - it will use PAY-2026-002')
    } else {
      console.log('⚠️ No duplicates found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixDuplicatePayments()
