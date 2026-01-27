require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuotesSchema() {
  console.log('Checking quotes table schema...\n');
  
  // Get one quote to see its structure
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching quote:', error);
    return;
  }
  
  if (quote) {
    console.log('Quote columns:');
    Object.keys(quote).sort().forEach(key => {
      console.log(`  - ${key}: ${typeof quote[key]}`);
    });
    
    console.log('\nLooking for price-related columns:');
    Object.keys(quote).filter(k => k.toLowerCase().includes('total') || k.toLowerCase().includes('price')).forEach(key => {
      console.log(`  ✓ ${key}: ${quote[key]}`);
    });
  } else {
    console.log('No quotes found in database');
  }
}

checkQuotesSchema().then(() => process.exit(0));
