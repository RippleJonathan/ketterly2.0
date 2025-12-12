const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, quote_number, status, lead_id')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\n=== Recent Quotes ===');
    quotes?.forEach(q => {
      console.log(`Quote: ${q.quote_number} | Status: ${q.status} | ID: ${q.id}`);
    });
    
    const { data: invoices } = await supabase
      .from('customer_invoices')
      .select('id, invoice_number, quote_id, lead_id, total')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\n=== Recent Invoices ===');
    if (invoices?.length) {
      invoices.forEach(inv => {
        console.log(`Invoice: ${inv.invoice_number} | Total: ${inv.total} | Quote ID: ${inv.quote_id}`);
      });
    } else {
      console.log('No invoices found');
    }
    
    // Check if trigger exists
    const { data: triggers } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT trigger_name, event_manipulation, event_object_table 
          FROM information_schema.triggers 
          WHERE trigger_name LIKE '%invoice%'
          ORDER BY trigger_name;
        `
      });
    
    console.log('\n=== Invoice Triggers ===');
    console.log(triggers);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
