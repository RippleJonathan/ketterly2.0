/**
 * Commission System Manual Test Script
 * 
 * This script helps verify the commission system enhancements are working correctly.
 * Run this in your browser console while viewing a lead detail page.
 * 
 * Usage:
 * 1. Open a lead detail page in your browser
 * 2. Open browser DevTools console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: await testCommissionSystem()
 */

async function testCommissionSystem() {
  console.log('🧪 Starting Commission System Tests...\n')
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  }
  
  // Test 1: Check if commission tab is visible
  console.log('Test 1: Checking if commission tab exists...')
  const commissionTab = document.querySelector('[data-state="active"]') || 
                       Array.from(document.querySelectorAll('button')).find(btn => 
                         btn.textContent.includes('Commissions')
                       )
  
  if (commissionTab) {
    results.passed.push('✅ Commission tab found')
    console.log('✅ Commission tab found')
  } else {
    results.failed.push('❌ Commission tab not found')
    console.log('❌ Commission tab not found')
  }
  
  // Test 2: Check for status badges
  console.log('\nTest 2: Checking for status badges...')
  const badges = document.querySelectorAll('[class*="bg-yellow-100"], [class*="bg-green-100"], [class*="bg-blue-100"], [class*="bg-emerald-100"]')
  
  if (badges.length > 0) {
    results.passed.push(`✅ Found ${badges.length} status badge(s)`)
    console.log(`✅ Found ${badges.length} status badge(s)`)
    
    // Check for specific status badges
    const statusTypes = Array.from(badges).map(badge => badge.textContent.trim())
    console.log('  Status types found:', statusTypes)
  } else {
    results.warnings.push('⚠️ No status badges found (commission data may be empty)')
    console.log('⚠️ No status badges found')
  }
  
  // Test 3: Check for expand/collapse buttons
  console.log('\nTest 3: Checking for expand/collapse functionality...')
  const chevronButtons = document.querySelectorAll('svg[class*="lucide-chevron"]')
  
  if (chevronButtons.length > 0) {
    results.passed.push(`✅ Found ${chevronButtons.length} expand button(s)`)
    console.log(`✅ Found ${chevronButtons.length} expand button(s)`)
  } else {
    results.warnings.push('⚠️ No expand buttons found (may indicate no commissions)')
    console.log('⚠️ No expand buttons found')
  }
  
  // Test 4: Check for Approve buttons (requires permission)
  console.log('\nTest 4: Checking for Approve buttons...')
  const approveButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Approve') && !btn.textContent.includes('Approved')
  )
  
  if (approveButtons.length > 0) {
    results.passed.push(`✅ Found ${approveButtons.length} Approve button(s) (user has approval permission)`)
    console.log(`✅ Found ${approveButtons.length} Approve button(s)`)
  } else {
    results.warnings.push('⚠️ No Approve buttons found (user may lack permission or no eligible commissions)')
    console.log('⚠️ No Approve buttons found')
  }
  
  // Test 5: Check for Mark Paid buttons
  console.log('\nTest 5: Checking for Mark Paid buttons...')
  const markPaidButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Mark Paid')
  )
  
  if (markPaidButtons.length > 0) {
    results.passed.push(`✅ Found ${markPaidButtons.length} Mark Paid button(s)`)
    console.log(`✅ Found ${markPaidButtons.length} Mark Paid button(s)`)
  } else {
    results.warnings.push('⚠️ No Mark Paid buttons found (may be no approved commissions)')
    console.log('⚠️ No Mark Paid buttons found')
  }
  
  // Test 6: Check for Refresh button
  console.log('\nTest 6: Checking for Refresh button...')
  const refreshButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Refresh')
  )
  
  if (refreshButton) {
    results.passed.push('✅ Refresh button found')
    console.log('✅ Refresh button found')
  } else {
    results.failed.push('❌ Refresh button not found')
    console.log('❌ Refresh button not found')
  }
  
  // Test 7: Check for tooltips (info icons)
  console.log('\nTest 7: Checking for payment trigger info icons...')
  const infoIcons = document.querySelectorAll('svg[class*="lucide-info"]')
  
  if (infoIcons.length > 0) {
    results.passed.push(`✅ Found ${infoIcons.length} info icon(s) for payment triggers`)
    console.log(`✅ Found ${infoIcons.length} info icon(s)`)
  } else {
    results.warnings.push('⚠️ No info icons found (may be no eligible commissions with payment triggers)')
    console.log('⚠️ No info icons found')
  }
  
  // Test 8: Check if commission table exists
  console.log('\nTest 8: Checking for commission table...')
  const table = document.querySelector('table')
  
  if (table) {
    results.passed.push('✅ Commission table found')
    console.log('✅ Commission table found')
    
    const rows = table.querySelectorAll('tbody tr')
    console.log(`  Found ${rows.length} row(s) in table`)
  } else {
    results.failed.push('❌ Commission table not found')
    console.log('❌ Commission table not found')
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  console.log('\n✅ PASSED TESTS:')
  results.passed.forEach(test => console.log('  ' + test))
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS (Expected if no commission data):')
    results.warnings.forEach(test => console.log('  ' + test))
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:')
    results.failed.forEach(test => console.log('  ' + test))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`Total: ${results.passed.length} passed, ${results.warnings.length} warnings, ${results.failed.length} failed`)
  console.log('='.repeat(60))
  
  if (results.failed.length === 0) {
    console.log('\n🎉 All critical tests passed!')
  } else {
    console.log('\n⚠️ Some tests failed - check the commission tab implementation')
  }
  
  return {
    passed: results.passed.length,
    warnings: results.warnings.length,
    failed: results.failed.length,
    details: results
  }
}

// Interactive test functions
function testExpandRow() {
  console.log('🧪 Testing row expansion...')
  const chevron = document.querySelector('svg[class*="lucide-chevron"]')
  if (chevron) {
    const button = chevron.closest('button')
    if (button) {
      button.click()
      console.log('✅ Clicked expand button - check if row expanded')
      setTimeout(() => {
        button.click()
        console.log('✅ Clicked collapse button - check if row collapsed')
      }, 1000)
    }
  } else {
    console.log('❌ No expand button found')
  }
}

function testApproveButton() {
  console.log('🧪 Testing Approve button...')
  const approveBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Approve') && !btn.textContent.includes('Approved')
  )
  
  if (approveBtn) {
    console.log('✅ Found Approve button')
    console.log('⚠️ Click it manually to test approval workflow')
    console.log('Expected: Loading state → Success toast → Status changes to "Approved"')
  } else {
    console.log('❌ No Approve button found')
  }
}

function testMarkPaidButton() {
  console.log('🧪 Testing Mark Paid button...')
  const markPaidBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Mark Paid')
  )
  
  if (markPaidBtn) {
    console.log('✅ Found Mark Paid button')
    console.log('⚠️ Click it manually to test mark paid workflow')
    console.log('Expected: Dialog opens → Enter date/reference → Status changes to "Paid"')
  } else {
    console.log('❌ No Mark Paid button found')
  }
}

console.log('📦 Commission System Test Suite Loaded!')
console.log('━'.repeat(60))
console.log('Available Commands:')
console.log('  await testCommissionSystem()  - Run all automated tests')
console.log('  testExpandRow()               - Test row expansion')
console.log('  testApproveButton()           - Test approve functionality')
console.log('  testMarkPaidButton()          - Test mark paid functionality')
console.log('━'.repeat(60))
console.log('\n👉 Start with: await testCommissionSystem()')
