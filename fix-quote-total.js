/**
 * Fix Quote Total
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixQuoteTotal() {
  console.log('🔧 Fixing quote total...\n')

  try {
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('quote_number', 'Q-2025-048')
      .single()

    if (error || !quote) {
      console.error('❌ Quote not found')
      return
    }

    console.log(`Found quote: ${quote.quote_number}`)
    console.log(`Current subtotal: $${quote.subtotal}`)
    console.log(`Current tax: $${quote.tax_amount}`)
    console.log(`Current total: $${quote.total}`)
    console.log()

    // Calculate correct total
    const subtotal = parseFloat(quote.subtotal || 0)
    const tax = parseFloat(quote.tax_amount || 0)
    const discount = parseFloat(quote.discount_amount || 0)
    const correctTotal = subtotal + tax - discount

    console.log(`Calculated total should be: $${correctTotal.toFixed(2)}`)
    console.log()

    if (parseFloat(quote.total) !== correctTotal) {
      console.log('⚠️  Total is incorrect. Updating...')
      
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ total: correctTotal })
        .eq('id', quote.id)

      if (updateError) {
        console.error('❌ Failed to update:', updateError.message)
        return
      }

      console.log('✅ Quote total updated successfully!')
      console.log(`   New total: $${correctTotal.toFixed(2)}`)
    } else {
      console.log('✅ Quote total is already correct!')
    }

    console.log('\n🎉 Done! Refresh your browser to see the correct quote amount.')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

fixQuoteTotal()
