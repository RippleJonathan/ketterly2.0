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
    console.log('=== Debug Invoice Creation ===\n');
    
    // 1. Check if trigger function exists
    console.log('1. Checking if trigger function exists...');
    const { data: functions } = await supabase
      .from('pg_proc')
      .select('proname')
      .like('proname', '%auto_create_invoice%');
    
    console.log('Functions found:', functions?.map(f => f.proname) || 'none');
    
    // 2. Check if trigger is attached to quotes table
    console.log('\n2. Checking if trigger is attached to quotes table...');
    const { data: triggers } = await supabase.rpc('exec_sql', {
      query: `
        SELECT tgname, tgtype, tgenabled
        FROM pg_trigger
        WHERE tgrelid = 'quotes'::regclass
        AND tgname LIKE '%invoice%';
      `
    });
    
    console.log('Triggers:', triggers);
    
    // 3. Get accepted quotes
    console.log('\n3. Getting accepted quotes...');
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, quote_number, status, lead_id, created_at')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`Found ${quotes?.length || 0} accepted quotes`);
    
    if (quotes && quotes.length > 0) {
      for (const quote of quotes) {
        // Check if invoice exists for this quote
        const { data: invoice } = await supabase
          .from('customer_invoices')
          .select('id, invoice_number')
          .eq('quote_id', quote.id)
          .is('deleted_at', null)
          .maybeSingle();
        
        console.log(`  Quote ${quote.quote_number}: ${invoice ? `✅ Invoice ${invoice.invoice_number}` : '❌ No invoice'}`);
      }
    }
    
    // 4. Check all invoices in system
    console.log('\n4. Checking all invoices in system...');
    const { data: allInvoices, count } = await supabase
      .from('customer_invoices')
      .select('id, invoice_number, lead_id, quote_id, created_at', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Total invoices: ${count}`);
    if (allInvoices && allInvoices.length > 0) {
      console.log('Recent invoices:');
      allInvoices.forEach(inv => {
        console.log(`  ${inv.invoice_number} - Quote ID: ${inv.quote_id || 'none'} - Created: ${inv.created_at}`);
      });
    }
    
    // 5. Try to manually create an invoice for testing
    console.log('\n5. Would you like to manually test invoice creation? (This will update a quote status)');
    console.log('   Run with --test flag to actually trigger');
    
    if (process.argv.includes('--test') && quotes && quotes.length > 0) {
      const testQuote = quotes[0];
      console.log(`\nTesting with quote: ${testQuote.quote_number}`);
      
      // Toggle status to trigger
      await supabase.from('quotes').update({ status: 'draft' }).eq('id', testQuote.id);
      await new Promise(resolve => setTimeout(resolve, 500));
      await supabase.from('quotes').update({ status: 'accepted' }).eq('id', testQuote.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if invoice was created
      const { data: newInvoice } = await supabase
        .from('customer_invoices')
        .select('invoice_number')
        .eq('quote_id', testQuote.id)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (newInvoice) {
        console.log(`✅ SUCCESS! Invoice ${newInvoice.invoice_number} was created`);
      } else {
        console.log('❌ FAILED! No invoice was created - trigger is not firing');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
})();
