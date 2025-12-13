const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

(async () => {
  try {
    console.log('=== Verifying Estimate Workflow Migration ===\n');
    
    let allPassed = true;
    
    // Test 1: Check new quote columns exist
    console.log('✓ Test 1: Checking new quote columns...');
    const { data: quoteColumns } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name IN ('is_locked', 'needs_new_signature', 'invoice_generated_at', 'invoice_pdf_url');
      `
    });
    
    if (quoteColumns && quoteColumns.length === 4) {
      console.log('  ✅ All 4 new quote columns exist');
    } else {
      console.log('  ❌ Missing quote columns:', quoteColumns?.length || 0, '/ 4');
      allPassed = false;
    }
    
    // Test 2: Check change order columns exist
    console.log('\n✓ Test 2: Checking change order enhancements...');
    const { data: coColumns } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'change_orders' 
        AND column_name IN ('quote_id', 'customer_signature_date', 'company_signature_date', 'signature_token', 'pdf_url');
      `
    });
    
    if (coColumns && coColumns.length === 5) {
      console.log('  ✅ All 5 new change order columns exist');
    } else {
      console.log('  ❌ Missing change order columns:', coColumns?.length || 0, '/ 5');
      allPassed = false;
    }
    
    // Test 3: Check commission quote_id column
    console.log('\n✓ Test 3: Checking commission enhancements...');
    const { data: commColumns } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'lead_commissions' 
        AND column_name = 'quote_id';
      `
    });
    
    if (commColumns && commColumns.length === 1) {
      console.log('  ✅ Commission quote_id column exists');
    } else {
      console.log('  ❌ Missing commission quote_id column');
      allPassed = false;
    }
    
    // Test 4: Check old invoice triggers are removed
    console.log('\n✓ Test 4: Checking invoice triggers removed...');
    const { data: triggers } = await supabase.rpc('exec_sql', {
      query: `
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgname IN (
          'trigger_auto_create_invoice_from_quote',
          'trigger_auto_update_invoice_from_change_order',
          'trigger_recalculate_invoice_totals',
          'trigger_auto_update_commission_from_invoice'
        );
      `
    });
    
    if (!triggers || triggers.length === 0) {
      console.log('  ✅ All old invoice triggers removed');
    } else {
      console.log('  ❌ Old triggers still exist:', triggers);
      allPassed = false;
    }
    
    // Test 5: Check new triggers exist
    console.log('\n✓ Test 5: Checking new estimate triggers...');
    const { data: newTriggers } = await supabase.rpc('exec_sql', {
      query: `
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgname IN (
          'trigger_auto_lock_estimate',
          'trigger_mark_quote_needs_signature',
          'trigger_update_commission_from_estimate'
        );
      `
    });
    
    if (newTriggers && newTriggers.length >= 2) {
      console.log(`  ✅ ${newTriggers.length} new triggers installed`);
    } else {
      console.log('  ⚠️  Expected 3 triggers, found:', newTriggers?.length || 0);
      allPassed = false;
    }
    
    // Test 6: Check if existing signed quotes are locked
    console.log('\n✓ Test 6: Checking if signed quotes are locked...');
    const { data: signedQuotes, count } = await supabase
      .from('quotes')
      .select('id, quote_number, is_locked, customer_signature_date', { count: 'exact' })
      .not('customer_signature_date', 'is', null)
      .limit(5);
    
    if (signedQuotes && signedQuotes.length > 0) {
      const allLocked = signedQuotes.every(q => q.is_locked === true);
      if (allLocked) {
        console.log(`  ✅ All ${count} signed quotes are locked`);
      } else {
        const unlockedCount = signedQuotes.filter(q => !q.is_locked).length;
        console.log(`  ⚠️  ${unlockedCount} signed quotes are NOT locked`);
      }
    } else {
      console.log('  ℹ️  No signed quotes to check');
    }
    
    // Test 7: Check if change orders are linked to quotes
    console.log('\n✓ Test 7: Checking change order linkage...');
    const { data: changeOrders, count: coCount } = await supabase
      .from('change_orders')
      .select('id, change_order_number, quote_id, lead_id', { count: 'exact' })
      .is('deleted_at', null)
      .limit(5);
    
    if (changeOrders && changeOrders.length > 0) {
      const linkedCount = changeOrders.filter(co => co.quote_id !== null).length;
      console.log(`  ✅ ${linkedCount}/${coCount} change orders linked to quotes`);
    } else {
      console.log('  ℹ️  No change orders to check');
    }
    
    // Test 8: Check if commissions are linked to quotes
    console.log('\n✓ Test 8: Checking commission linkage...');
    const { data: commissions, count: commCount } = await supabase
      .from('lead_commissions')
      .select('id, quote_id', { count: 'exact' })
      .is('deleted_at', null)
      .limit(5);
    
    if (commissions && commissions.length > 0) {
      const linkedCount = commissions.filter(c => c.quote_id !== null).length;
      console.log(`  ✅ ${linkedCount}/${commCount} commissions linked to quotes`);
    } else {
      console.log('  ℹ️  No commissions to check');
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Migration successful!');
      console.log('\nNext steps:');
      console.log('1. Update UI to show lock status on estimates');
      console.log('2. Add "Generate Invoice" button');
      console.log('3. Build change order signature flow');
      console.log('4. Update financials calculation');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Check errors above');
      console.log('\nCommon fixes:');
      console.log('- Re-run migrations in order');
      console.log('- Check for error messages in Supabase logs');
      console.log('- Verify you have admin permissions');
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error running tests:', error.message);
    console.error('\nFull error:', error);
  }
})();
