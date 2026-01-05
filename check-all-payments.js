/**
 * Check and clean all payments for 2026
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllPayments() {
  console.log('🔍 Checking all 2026 payments...\n')
  
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, payment_number, created_at, amount, deleted_at')
      .like('payment_number', 'PAY-2026-%')
      .order('payment_number', { ascending: true })
    
    if (error) {
      console.error('❌ Error:', error.message)
      return
    }
    
    console.log(`Found ${payments?.length || 0} payment(s) for 2026:\n`)
    
    if (payments && payments.length > 0) {
      payments.forEach((p, i) => {
        console.log(`${i + 1}. ${p.payment_number}`)
        console.log(`   ID: ${p.id}`)
        console.log(`   Amount: $${p.amount}`)
        console.log(`   Created: ${new Date(p.created_at).toLocaleString()}`)
        console.log(`   Deleted: ${p.deleted_at ? 'YES (' + new Date(p.deleted_at).toLocaleString() + ')' : 'NO'}`)
        console.log('')
      })
      
      // Find next available number
      const numbers = payments.map(p => {
        const match = p.payment_number.match(/PAY-2026-(\d+)/)
        return match ? parseInt(match[1]) : 0
      }).filter(n => n > 0)
      
      const maxNum = Math.max(...numbers)
      const nextNum = (maxNum + 1).toString().padStart(3, '0')
      
      console.log(`📊 Max number used: ${maxNum}`)
      console.log(`✅ Next available: PAY-2026-${nextNum}`)
      
    } else {
      console.log('⚠️ No payments found')
      console.log('✅ Next available: PAY-2026-001')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkAllPayments()
