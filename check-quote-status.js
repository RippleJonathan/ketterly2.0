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
    console.log('=== Checking Quote Status & Trigger ===\n');
    
    // Get the most recent quote (the one you just signed)
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, quote_number, status, lead_id, customer_signature_date, company_signature_date')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!quote) {
      console.log('No quotes found');
      return;
    }
    
    console.log('Most recent quote:', quote.quote_number);
    console.log('Status:', quote.status);
    console.log('Customer signed:', quote.customer_signature_date ? '✅ Yes' : '❌ No');
    console.log('Company signed:', quote.company_signature_date ? '✅ Yes' : '❌ No');
    
    // Check trigger configuration
    console.log('\n=== Checking Trigger Configuration ===');
    
    const { data: triggerCheck, error: triggerError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          t.tgname as trigger_name,
          p.proname as function_name,
          CASE t.tgtype::integer & 1
            WHEN 1 THEN 'ROW'
            ELSE 'STATEMENT'
          END as level,
          CASE t.tgtype::integer & 66
            WHEN 2 THEN 'BEFORE'
            WHEN 64 THEN 'INSTEAD OF'
            ELSE 'AFTER'
          END as timing,
          CASE 
            WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT'
            WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE'
            WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE'
          END as event,
          t.tgenabled
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgrelid = 'quotes'::regclass
        AND t.tgname LIKE '%invoice%';
      `
    });
    
    if (triggerError) {
      console.log('Error checking trigger:', triggerError);
    } else if (triggerCheck && triggerCheck.length > 0) {
      console.log('✅ Trigger found:', triggerCheck[0]);
    } else {
      console.log('❌ NO TRIGGER FOUND!');
    }
    
    // Check if invoice exists
    console.log('\n=== Checking for Invoice ===');
    const { data: invoice } = await supabase
      .from('customer_invoices')
      .select('id, invoice_number, total, status')
      .eq('quote_id', quote.id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (invoice) {
      console.log('✅ Invoice exists:', invoice.invoice_number);
      console.log('   Amount:', invoice.total);
      console.log('   Status:', invoice.status);
    } else {
      console.log('❌ NO INVOICE FOUND');
      
      // Try to manually trigger by updating status
      console.log('\n=== Manually Triggering ===');
      console.log('Current status:', quote.status);
      
      if (quote.status !== 'accepted') {
        console.log('Setting status to accepted...');
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ status: 'accepted' })
          .eq('id', quote.id);
        
        if (updateError) {
          console.log('Error updating:', updateError);
        } else {
          console.log('✅ Status updated to accepted');
          
          // Wait and check again
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: newInvoice } = await supabase
            .from('customer_invoices')
            .select('invoice_number')
            .eq('quote_id', quote.id)
            .is('deleted_at', null)
            .maybeSingle();
          
          if (newInvoice) {
            console.log('🎉 Invoice created:', newInvoice.invoice_number);
          } else {
            console.log('❌ Still no invoice - trigger not working');
          }
        }
      } else {
        console.log('Status is already accepted - trigger should have fired');
        console.log('ISSUE: Trigger is not firing on status update');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
