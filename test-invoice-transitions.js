/**
 * Invoice & Payment Auto-Transition Test Script
 * 
 * Tests the newly implemented auto-transitions for:
 * 1. Invoice creation → INVOICED/INVOICE_SENT
 * 2. Partial payment → INVOICED/PARTIAL_PAYMENT
 * 3. Full payment → INVOICED/PAID
 * 
 * Run with: node test-invoice-transitions.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test tracking
let passed = 0
let failed = 0
const failures = []

function log(emoji, message) {
  console.log(`${emoji} ${message}`)
}

function pass(testName) {
  passed++
  log('✅', testName)
}

function fail(testName, error) {
  failed++
  failures.push({ test: testName, error })
  log('❌', `${testName}: ${error}`)
}

async function testInvoiceCreationTransition() {
  log('🔍', '\n=== Testing Invoice Creation Auto-Transition ===\n')

  let testCompanyId, testLeadId, testQuoteId, testInvoiceId

  try {
    // Setup: Create test company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Invoice Transition Company',
        slug: `test-invoice-${Date.now()}`,
      })
      .select()
      .single()

    if (companyError) throw companyError
    testCompanyId = company.id
    log('📝', `Created test company: ${testCompanyId}`)

    // Setup: Create test lead in PRODUCTION/COMPLETED
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        company_id: testCompanyId,
        full_name: 'Invoice Test Customer',
        email: 'invoice-test@example.com',
        phone: '5555551111',
        status: 'production',
        sub_status: 'completed',
      })
      .select()
      .single()

    if (leadError) throw leadError
    testLeadId = lead.id
    log('📝', `Created test lead: ${testLeadId} (PRODUCTION/COMPLETED)`)

    // Setup: Create test quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        company_id: testCompanyId,
        lead_id: testLeadId,
        quote_number: `TEST-INV-${Date.now()}`,
        status: 'accepted',
        subtotal: 10000,
        tax_amount: 825,
        total: 10825,
      })
      .select()
      .single()

    if (quoteError) throw quoteError
    testQuoteId = quote.id
    log('📝', `Created test quote: ${testQuoteId}`)

    // Test 1: Create invoice and verify auto-transition
    log('🧪', 'Creating invoice...')
    
    const invoiceNumber = `INV-TEST-${Date.now()}`
    const { data: invoice, error: invoiceError } = await supabase
      .from('customer_invoices')
      .insert({
        company_id: testCompanyId,
        lead_id: testLeadId,
        quote_id: testQuoteId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'sent',
        subtotal: 10000,
        tax_amount: 825,
        total: 10825,
        amount_paid: 0,
      })
      .select()
      .single()

    if (invoiceError) {
      log('❌', `Invoice creation failed: ${invoiceError.message}`)
      throw invoiceError
    }
    if (!invoice) throw new Error('Invoice creation returned null')
    testInvoiceId = invoice.id
    log('📝', `Created test invoice: ${invoiceNumber}`)

    // Wait for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if lead status was updated
    const { data: updatedLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('status, sub_status')
      .eq('id', testLeadId)
      .single()

    if (leadCheckError) {
      fail('Invoice creation auto-transition', leadCheckError.message)
    } else if (updatedLead.status === 'invoiced' && updatedLead.sub_status === 'sent') {
      pass('Invoice creation auto-transition (PRODUCTION/COMPLETED → INVOICED/SENT)')
      log('📊', `  Status: ${updatedLead.status}/${updatedLead.sub_status}`)
    } else {
      fail('Invoice creation auto-transition', `Expected invoiced/sent, got ${updatedLead.status}/${updatedLead.sub_status}`)
    }

    // Test 2: Check status history
    const { data: history, error: historyError } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', testLeadId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (historyError) {
      fail('Invoice transition history logged', historyError.message)
    } else if (history && history.length > 0) {
      const entry = history[0]
      if (entry.from_status === 'production' && 
          entry.to_status === 'invoiced' &&
          entry.to_sub_status === 'sent' &&
          entry.automated === true) {
        pass('Invoice transition logged in history with automated=true')
        
        // Check metadata
        if (entry.metadata) {
          const metadata = typeof entry.metadata === 'string' 
            ? JSON.parse(entry.metadata) 
            : entry.metadata
          
          if (metadata.trigger === 'invoice_created' && 
              metadata.invoice_id === testInvoiceId &&
              metadata.invoice_number === invoiceNumber) {
            pass('Invoice transition metadata is correct')
            log('📊', `  Metadata: trigger=${metadata.trigger}, invoice_number=${metadata.invoice_number}`)
          } else {
            fail('Invoice transition metadata', `Missing or incorrect metadata: ${JSON.stringify(metadata)}`)
          }
        } else {
          fail('Invoice transition metadata', 'No metadata stored')
        }
      } else {
        fail('Invoice transition history', `Unexpected history: automated=${entry.automated}, from=${entry.from_status}, to=${entry.to_status}`)
      }
    } else {
      fail('Invoice transition history logged', 'No history entries found')
    }

  } catch (error) {
    fail('Invoice creation transition test suite', error.message)
  } finally {
    // Cleanup
    if (testInvoiceId) {
      await supabase.from('customer_invoices').delete().eq('id', testInvoiceId)
    }
    if (testQuoteId) {
      await supabase.from('quotes').delete().eq('id', testQuoteId)
    }
    if (testLeadId) {
      await supabase.from('lead_status_history').delete().eq('lead_id', testLeadId)
      await supabase.from('leads').delete().eq('id', testLeadId)
    }
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId)
    }
    log('🧹', 'Cleaned up invoice test data')
  }
}

async function testPartialPaymentTransition() {
  log('🔍', '\n=== Testing Partial Payment Auto-Transition ===\n')

  let testCompanyId, testLeadId, testInvoiceId, testPaymentId

  try {
    // Setup: Create test company
    const { data: company } = await supabase
      .from('companies')
      .insert({
        name: 'Test Partial Payment Company',
        slug: `test-partial-${Date.now()}`,
      })
      .select()
      .single()

    testCompanyId = company.id
    log('📝', `Created test company: ${testCompanyId}`)

    // Setup: Create test lead in INVOICED/SENT
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        company_id: testCompanyId,
        full_name: 'Partial Payment Customer',
        email: 'partial@example.com',
        phone: '5555552222',
        status: 'invoiced',
        sub_status: 'sent',
      })
      .select()
      .single()

    testLeadId = lead.id
    log('📝', `Created test lead: ${testLeadId} (INVOICED/SENT)`)

    // Setup: Create test invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('customer_invoices')
      .insert({
        company_id: testCompanyId,
        lead_id: testLeadId,
        invoice_number: `INV-PARTIAL-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'sent',
        subtotal: 10000,
        tax_amount: 825,
        total: 10825,
        amount_paid: 0,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) throw new Error('Invoice creation returned null')
    testInvoiceId = invoice.id
    log('📝', `Created test invoice: ${testInvoiceId} (Total: $10,825)`)

    // Test: Record partial payment (50%)
    log('🧪', 'Recording partial payment ($5,000)...')
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        company_id: testCompanyId,
        lead_id: testLeadId,
        invoice_id: testInvoiceId,
        payment_number: `PAY-PARTIAL-${Date.now()}`,
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000,
        payment_method: 'check',
        cleared: true,
      })
      .select()
      .single()

    if (paymentError) throw paymentError
    testPaymentId = payment.id
    log('📝', `Created partial payment: ${payment.payment_number}`)

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if lead status was updated
    const { data: updatedLead } = await supabase
      .from('leads')
      .select('status, sub_status')
      .eq('id', testLeadId)
      .single()

    if (updatedLead.status === 'invoiced' && updatedLead.sub_status === 'partial_payment') {
      pass('Partial payment auto-transition (INVOICED/SENT → INVOICED/PARTIAL_PAYMENT)')
      log('📊', `  Status: ${updatedLead.status}/${updatedLead.sub_status}`)
    } else {
      fail('Partial payment auto-transition', `Expected invoiced/partial_payment, got ${updatedLead.status}/${updatedLead.sub_status}`)
    }

    // Check status history
    const { data: history } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', testLeadId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (history && history.length > 0) {
      const entry = history[0]
      if (entry.automated === true && entry.to_sub_status === 'partial_payment') {
        pass('Partial payment transition logged with automated=true')
        
        if (entry.metadata) {
          const metadata = typeof entry.metadata === 'string' 
            ? JSON.parse(entry.metadata) 
            : entry.metadata
          
          if (metadata.trigger === 'payment_recorded' && 
              metadata.payment_amount === 5000 &&
              metadata.balance_remaining === 5825 &&
              metadata.paid_in_full === false) {
            pass('Partial payment metadata is correct')
            log('📊', `  Paid: $${metadata.payment_amount}, Remaining: $${metadata.balance_remaining}`)
          } else {
            fail('Partial payment metadata', `Incorrect metadata: ${JSON.stringify(metadata)}`)
          }
        }
      } else {
        fail('Partial payment history', 'Missing or incorrect history entry')
      }
    }

  } catch (error) {
    fail('Partial payment transition test suite', error.message)
  } finally {
    // Cleanup
    if (testPaymentId) {
      await supabase.from('payments').delete().eq('id', testPaymentId)
    }
    if (testInvoiceId) {
      await supabase.from('customer_invoices').delete().eq('id', testInvoiceId)
    }
    if (testLeadId) {
      await supabase.from('lead_status_history').delete().eq('lead_id', testLeadId)
      await supabase.from('leads').delete().eq('id', testLeadId)
    }
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId)
    }
    log('🧹', 'Cleaned up partial payment test data')
  }
}

async function testFullPaymentTransition() {
  log('🔍', '\n=== Testing Full Payment Auto-Transition ===\n')

  let testCompanyId, testLeadId, testInvoiceId, testPaymentId

  try {
    // Setup: Create test company
    const { data: company } = await supabase
      .from('companies')
      .insert({
        name: 'Test Full Payment Company',
        slug: `test-full-${Date.now()}`,
      })
      .select()
      .single()

    testCompanyId = company.id
    log('📝', `Created test company: ${testCompanyId}`)

    // Setup: Create test lead in INVOICED/SENT
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        company_id: testCompanyId,
        full_name: 'Full Payment Customer',
        email: 'fullpay@example.com',
        phone: '5555553333',
        status: 'invoiced',
        sub_status: 'sent',
      })
      .select()
      .single()

    testLeadId = lead.id
    log('📝', `Created test lead: ${testLeadId} (INVOICED/SENT)`)

    // Setup: Create test invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('customer_invoices')
      .insert({
        company_id: testCompanyId,
        lead_id: testLeadId,
        invoice_number: `INV-FULL-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'sent',
        subtotal: 5000,
        tax_amount: 412.50,
        total: 5412.50,
        amount_paid: 0,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError
    if (!invoice) throw new Error('Invoice creation returned null')
    testInvoiceId = invoice.id
    log('📝', `Created test invoice: ${testInvoiceId} (Total: $5,412.50)`)

    // Test: Record full payment
    log('🧪', 'Recording full payment ($5,412.50)...')
    
    const { data: payment } = await supabase
      .from('payments')
      .insert({
        company_id: testCompanyId,
        lead_id: testLeadId,
        invoice_id: testInvoiceId,
        payment_number: `PAY-FULL-${Date.now()}`,
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5412.50,
        payment_method: 'credit_card',
        cleared: true,
      })
      .select()
      .single()

    testPaymentId = payment.id
    log('📝', `Created full payment: ${payment.payment_number}`)

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if lead status was updated
    const { data: updatedLead } = await supabase
      .from('leads')
      .select('status, sub_status')
      .eq('id', testLeadId)
      .single()

    if (updatedLead.status === 'invoiced' && updatedLead.sub_status === 'paid') {
      pass('Full payment auto-transition (INVOICED/SENT → INVOICED/PAID)')
      log('📊', `  Status: ${updatedLead.status}/${updatedLead.sub_status}`)
    } else {
      fail('Full payment auto-transition', `Expected invoiced/paid, got ${updatedLead.status}/${updatedLead.sub_status}`)
    }

    // Check status history
    const { data: history } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', testLeadId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (history && history.length > 0) {
      const entry = history[0]
      if (entry.automated === true && entry.to_sub_status === 'paid') {
        pass('Full payment transition logged with automated=true')
        
        if (entry.metadata) {
          const metadata = typeof entry.metadata === 'string' 
            ? JSON.parse(entry.metadata) 
            : entry.metadata
          
          if (metadata.trigger === 'payment_recorded' && 
              metadata.payment_amount === 5412.50 &&
              metadata.balance_remaining <= 0 &&
              metadata.paid_in_full === true) {
            pass('Full payment metadata is correct')
            log('📊', `  Paid in full: $${metadata.payment_amount}`)
          } else {
            fail('Full payment metadata', `Incorrect metadata: ${JSON.stringify(metadata)}`)
          }
        }
      } else {
        fail('Full payment history', 'Missing or incorrect history entry')
      }
    }

  } catch (error) {
    fail('Full payment transition test suite', error.message)
  } finally {
    // Cleanup
    if (testPaymentId) {
      await supabase.from('payments').delete().eq('id', testPaymentId)
    }
    if (testInvoiceId) {
      await supabase.from('customer_invoices').delete().eq('id', testInvoiceId)
    }
    if (testLeadId) {
      await supabase.from('lead_status_history').delete().eq('lead_id', testLeadId)
      await supabase.from('leads').delete().eq('id', testLeadId)
    }
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId)
    }
    log('🧹', 'Cleaned up full payment test data')
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60))
  console.log('  INVOICE & PAYMENT AUTO-TRANSITIONS - TEST SUITE')
  console.log('='.repeat(60))

  await testInvoiceCreationTransition()
  await testPartialPaymentTransition()
  await testFullPaymentTransition()

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('  TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total:  ${passed + failed}`)
  
  if (failed > 0) {
    console.log('\n❌ FAILURES:')
    failures.forEach(({ test, error }, idx) => {
      console.log(`  ${idx + 1}. ${test}`)
      console.log(`     ${error}`)
    })
  } else {
    console.log('\n🎉 All tests passed! Invoice and payment auto-transitions are working correctly.')
    console.log('\n✨ What was tested:')
    console.log('   ✅ Invoice creation → INVOICED/SENT')
    console.log('   ✅ Partial payment → INVOICED/PARTIAL_PAYMENT')
    console.log('   ✅ Full payment → INVOICED/PAID')
    console.log('   ✅ Status history logging with metadata')
    console.log('   ✅ Automated flag = true for all transitions')
  }

  console.log('='.repeat(60) + '\n')

  process.exit(failed > 0 ? 1 : 0)
}

runAllTests()
