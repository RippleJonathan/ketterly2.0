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
    console.log('=== Testing Invoice Trigger ===\n');
    
    // Get a quote that's accepted but has no invoice
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, quote_number, status, lead_id, company_id, subtotal, tax_rate, tax_amount, total_amount')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!quote) {
      console.log('No accepted quotes found');
      return;
    }
    
    console.log(`Found quote: ${quote.quote_number} (${quote.id})`);
    console.log(`Status: ${quote.status}`);
    
    // Check if it already has an invoice
    const { data: existingInvoice } = await supabase
      .from('customer_invoices')
      .select('invoice_number')
      .eq('quote_id', quote.id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (existingInvoice) {
      console.log(`✅ Already has invoice: ${existingInvoice.invoice_number}`);
      return;
    }
    
    console.log('❌ No invoice exists for this accepted quote');
    console.log('\n=== Manually triggering by updating quote ===');
    
    // Manually trigger by updating the quote status (set to draft then back to accepted)
    console.log('Step 1: Setting status to draft...');
    await supabase
      .from('quotes')
      .update({ status: 'draft' })
      .eq('id', quote.id);
    
    console.log('Step 2: Setting status back to accepted...');
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: 'accepted' })
      .eq('id', quote.id);
    
    if (updateError) {
      console.error('Error updating quote:', updateError);
      return;
    }
    
    console.log('✅ Quote status updated');
    
    // Wait a second for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if invoice was created
    console.log('\n=== Checking if invoice was created ===');
    const { data: newInvoice } = await supabase
      .from('customer_invoices')
      .select('invoice_number, total, created_at')
      .eq('quote_id', quote.id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (newInvoice) {
      console.log(`🎉 SUCCESS! Invoice created: ${newInvoice.invoice_number}`);
      console.log(`   Total: $${newInvoice.total}`);
      console.log(`   Created: ${newInvoice.created_at}`);
      
      // Check line items
      const { data: lineItems } = await supabase
        .from('invoice_line_items')
        .select('description, quantity, unit_price')
        .eq('invoice_id', newInvoice.invoice_number);
      
      console.log(`   Line items: ${lineItems?.length || 0}`);
    } else {
      console.log('❌ FAILED - No invoice created');
      console.log('The trigger is NOT working properly');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
