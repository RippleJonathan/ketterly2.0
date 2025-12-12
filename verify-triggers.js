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
    // Direct query to check for triggers
    const { data, error } = await supabase
      .from('pg_trigger')
      .select('*')
      .ilike('tgname', '%invoice%');
    
    if (error) {
      console.log('Error querying triggers (expected - trying alternate method)');
      
      // Try checking if the function exists instead
      const { data: funcs, error: funcError } = await supabase
        .rpc('exec_sql', {
          query: "SELECT proname FROM pg_proc WHERE proname LIKE '%invoice%';"
        });
      
      if (funcError) {
        console.log('exec_sql not available, checking via metadata...\n');
        
        // Just try to create an invoice manually to test
        const testQuoteId = 'ad44c9d4-db04-4aba-9544-60de0eb33337'; // Most recent accepted quote
        
        console.log('Checking if invoice exists for quote:', testQuoteId);
        const { data: invoice } = await supabase
          .from('customer_invoices')
          .select('*')
          .eq('quote_id', testQuoteId)
          .maybeSingle();
        
        if (invoice) {
          console.log('Invoice EXISTS for this quote:', invoice.invoice_number);
        } else {
          console.log('NO INVOICE found for accepted quote - trigger is NOT working');
        }
        
        // Check the most recent 5 accepted quotes
        const { data: acceptedQuotes } = await supabase
          .from('quotes')
          .select('id, quote_number, status, created_at')
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(5);
        
        console.log('\n=== Checking Accepted Quotes for Invoices ===');
        for (const quote of acceptedQuotes || []) {
          const { data: inv } = await supabase
            .from('customer_invoices')
            .select('invoice_number')
            .eq('quote_id', quote.id)
            .maybeSingle();
          
          console.log(`${quote.quote_number}: ${inv ? '✅ Has invoice ' + inv.invoice_number : '❌ NO INVOICE'}`);
        }
        
        return;
      }
      
      console.log('Functions:', funcs);
    } else {
      console.log('Triggers found:', data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
