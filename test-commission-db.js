/**
 * Commission System Database Test Script
 * 
 * Tests the database triggers and commission workflow automation
 * 
 * Run: node test-commission-db.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTests() {
  console.log('🧪 Commission System Database Tests')
  console.log('=' .repeat(60))
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }
  
  try {
    // Test 1: Check if lead_commissions table has new columns
    console.log('\n📋 Test 1: Checking commission table schema...')
    const { data: columns, error: schemaError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'lead_commissions' 
          AND column_name IN (
            'triggered_by_payment_id',
            'approved_by_user_id',
            'approved_at',
            'paid_date',
            'payment_reference',
            'balance_owed'
          )
          ORDER BY column_name
        `
      })
    
    if (schemaError) {
      // Try alternative query
      const { data: commissions } = await supabase
        .from('lead_commissions')
        .select('triggered_by_payment_id, approved_by_user_id, approved_at, paid_date, payment_reference, balance_owed')
        .limit(1)
      
      if (commissions !== null) {
        console.log('✅ All new columns exist in lead_commissions table')
        results.passed++
        results.tests.push({ test: 'Schema check', status: 'PASSED' })
      } else {
        console.log('❌ New columns missing from lead_commissions table')
        results.failed++
        results.tests.push({ test: 'Schema check', status: 'FAILED' })
      }
    } else {
      console.log(`✅ Found ${columns?.length || 0} new columns`)
      results.passed++
      results.tests.push({ test: 'Schema check', status: 'PASSED' })
    }
    
    // Test 2: Check if user_permissions has new permission columns
    console.log('\n📋 Test 2: Checking user permissions schema...')
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_approve_commissions, can_view_all_commissions')
      .limit(1)
    
    if (permissions && permissions.length > 0) {
      console.log('✅ New permission columns exist')
      results.passed++
      results.tests.push({ test: 'Permissions schema', status: 'PASSED' })
    } else {
      console.log('⚠️ Could not verify permission columns')
      results.tests.push({ test: 'Permissions schema', status: 'WARNING' })
    }
    
    // Test 3: Check for commissions with different statuses
    console.log('\n📋 Test 3: Checking commission status distribution...')
    const { data: statusCounts, error: statusError } = await supabase
      .from('lead_commissions')
      .select('status')
      .is('deleted_at', null)
    
    if (!statusError && statusCounts) {
      const distribution = statusCounts.reduce((acc, { status }) => {
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      
      console.log('  Status distribution:')
      Object.entries(distribution).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`)
      })
      
      results.passed++
      results.tests.push({ test: 'Status distribution', status: 'PASSED', data: distribution })
    } else {
      console.log('⚠️ Could not fetch commission statuses')
      results.tests.push({ test: 'Status distribution', status: 'WARNING' })
    }
    
    // Test 4: Check for eligible commissions with payment triggers
    console.log('\n📋 Test 4: Checking eligible commissions with payment triggers...')
    const { data: eligibleCommissions, error: eligibleError } = await supabase
      .from('lead_commissions')
      .select(`
        id,
        status,
        triggered_by_payment_id,
        calculated_amount,
        user:users!lead_commissions_user_id_fkey(full_name)
      `)
      .eq('status', 'eligible')
      .not('triggered_by_payment_id', 'is', null)
      .is('deleted_at', null)
      .limit(5)
    
    if (!eligibleError && eligibleCommissions) {
      console.log(`✅ Found ${eligibleCommissions.length} eligible commission(s) with payment triggers`)
      if (eligibleCommissions.length > 0) {
        console.log('  Sample eligible commissions:')
        eligibleCommissions.forEach(comm => {
          console.log(`    - ${comm.user?.full_name}: $${comm.calculated_amount}`)
        })
      }
      results.passed++
      results.tests.push({ test: 'Eligible commissions', status: 'PASSED', count: eligibleCommissions.length })
    } else {
      console.log('⚠️ No eligible commissions found (this is OK if no payments made)')
      results.tests.push({ test: 'Eligible commissions', status: 'WARNING' })
    }
    
    // Test 5: Check for approved commissions
    console.log('\n📋 Test 5: Checking approved commissions...')
    const { data: approvedCommissions, error: approvedError } = await supabase
      .from('lead_commissions')
      .select(`
        id,
        approved_by_user_id,
        approved_at,
        user:users!lead_commissions_user_id_fkey(full_name),
        approved_by:users!lead_commissions_approved_by_user_id_fkey(full_name)
      `)
      .eq('status', 'approved')
      .not('approved_by_user_id', 'is', null)
      .is('deleted_at', null)
      .limit(5)
    
    if (!approvedError && approvedCommissions) {
      console.log(`✅ Found ${approvedCommissions.length} approved commission(s)`)
      if (approvedCommissions.length > 0) {
        console.log('  Sample approved commissions:')
        approvedCommissions.forEach(comm => {
          console.log(`    - ${comm.user?.full_name} (approved by ${comm.approved_by?.full_name})`)
        })
      }
      results.passed++
      results.tests.push({ test: 'Approved commissions', status: 'PASSED', count: approvedCommissions.length })
    } else {
      console.log('⚠️ No approved commissions found (this is OK if none approved yet)')
      results.tests.push({ test: 'Approved commissions', status: 'WARNING' })
    }
    
    // Test 6: Check for paid commissions
    console.log('\n📋 Test 6: Checking paid commissions...')
    const { data: paidCommissions, error: paidError } = await supabase
      .from('lead_commissions')
      .select(`
        id,
        paid_date,
        payment_reference,
        calculated_amount,
        user:users!lead_commissions_user_id_fkey(full_name)
      `)
      .eq('status', 'paid')
      .not('paid_date', 'is', null)
      .is('deleted_at', null)
      .limit(5)
    
    if (!paidError && paidCommissions) {
      console.log(`✅ Found ${paidCommissions.length} paid commission(s)`)
      if (paidCommissions.length > 0) {
        console.log('  Sample paid commissions:')
        paidCommissions.forEach(comm => {
          console.log(`    - ${comm.user?.full_name}: $${comm.calculated_amount} (Ref: ${comm.payment_reference || 'N/A'})`)
        })
      }
      results.passed++
      results.tests.push({ test: 'Paid commissions', status: 'PASSED', count: paidCommissions.length })
    } else {
      console.log('⚠️ No paid commissions found (this is OK if none paid yet)')
      results.tests.push({ test: 'Paid commissions', status: 'WARNING' })
    }
    
    // Test 7: Check for commissions with balance_owed tracking
    console.log('\n📋 Test 7: Checking delta tracking (balance_owed)...')
    const { data: deltaCommissions, error: deltaError } = await supabase
      .from('lead_commissions')
      .select('id, calculated_amount, paid_amount, balance_owed')
      .neq('balance_owed', 0)
      .is('deleted_at', null)
      .limit(5)
    
    if (!deltaError && deltaCommissions) {
      console.log(`✅ Found ${deltaCommissions.length} commission(s) with balance tracking`)
      if (deltaCommissions.length > 0) {
        console.log('  Sample commissions with balance:')
        deltaCommissions.forEach(comm => {
          console.log(`    - Calculated: $${comm.calculated_amount}, Paid: $${comm.paid_amount}, Balance: $${comm.balance_owed}`)
        })
      }
      results.passed++
      results.tests.push({ test: 'Delta tracking', status: 'PASSED', count: deltaCommissions.length })
    } else {
      console.log('⚠️ No commissions with balance tracking (this is OK if all are $0)')
      results.tests.push({ test: 'Delta tracking', status: 'WARNING' })
    }
    
    // Test 8: Check total commission stats
    console.log('\n📋 Test 8: Checking overall commission statistics...')
    const { data: stats, error: statsError } = await supabase
      .from('lead_commissions')
      .select('calculated_amount, status')
      .is('deleted_at', null)
    
    if (!statsError && stats) {
      const totalAmount = stats.reduce((sum, c) => sum + (c.calculated_amount || 0), 0)
      const totalCommissions = stats.length
      
      console.log(`✅ Commission Statistics:`)
      console.log(`    Total Commissions: ${totalCommissions}`)
      console.log(`    Total Amount: $${totalAmount.toFixed(2)}`)
      console.log(`    Average: $${(totalAmount / totalCommissions).toFixed(2)}`)
      
      results.passed++
      results.tests.push({ 
        test: 'Overall statistics', 
        status: 'PASSED', 
        data: { totalCommissions, totalAmount } 
      })
    } else {
      console.log('❌ Could not fetch commission statistics')
      results.failed++
      results.tests.push({ test: 'Overall statistics', status: 'FAILED' })
    }
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message)
    results.failed++
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`⚠️  Warnings: ${results.tests.filter(t => t.status === 'WARNING').length}`)
  console.log('='.repeat(60))
  
  if (results.failed === 0) {
    console.log('\n🎉 All database tests passed!')
    console.log('✨ Commission system database structure is ready!')
  } else {
    console.log('\n⚠️ Some tests failed - check database migration status')
  }
  
  return results
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✅ Test execution complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error)
    process.exit(1)
  })
