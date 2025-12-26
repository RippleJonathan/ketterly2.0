/**
 * Check Quote Data
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

async function checkQuotes() {
  console.log('🔍 Checking quote data...\n')

  try {
    // Get quotes with Q-2025-048
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('id, quote_number, subtotal, tax_amount, total')
      .eq('quote_number', 'Q-2025-048')

    if (error) {
      console.error('❌ Error:', error.message)
      return
    }

    if (!quotes || quotes.length === 0) {
      console.log('❌ No quote found with number Q-2025-048')
      return
    }

    console.log('✅ Found quote:\n')
    quotes.forEach(quote => {
      console.log(`Quote Number: ${quote.quote_number}`)
      console.log(`ID: ${quote.id}`)
      console.log(`Subtotal: $${quote.subtotal}`)
      console.log(`Tax: $${quote.tax_amount}`)
      console.log(`Total: $${quote.total}`)
      console.log()
    })

    // Get line items for this quote
    const { data: lineItems, error: lineItemError } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quotes[0].id)

    if (lineItemError) {
      console.error('❌ Error getting line items:', lineItemError.message)
      return
    }

    console.log(`📋 Line Items (${lineItems?.length || 0}):\n`)
    if (lineItems && lineItems.length > 0) {
      lineItems.forEach((item, i) => {
        console.log(`${i + 1}. ${item.description}`)
        console.log(`   Qty: ${item.quantity} × $${item.unit_price} = $${item.total_price}`)
      })
      console.log()
      
      const calculatedTotal = lineItems.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0)
      console.log(`Calculated Total from Line Items: $${calculatedTotal.toFixed(2)}`)
    }

    if (parseFloat(quotes[0].total) === 0 && lineItems && lineItems.length > 0) {
      console.log('\n⚠️  Quote total is $0 but has line items!')
      console.log('💡 The quote totals may need to be recalculated.')
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

checkQuotes()
