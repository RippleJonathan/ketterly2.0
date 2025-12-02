/**
 * SIMPLIFIED APPROACH
 * 
 * Since we can't execute raw SQL from Node.js easily,
 * this script will guide you through the manual process
 */

require('dotenv').config({ path: '.env.local' })

console.log('\n🔧 QUOTE SIGNATURE DATABASE FIX\n')
console.log('=' .repeat(60))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}

console.log('\n📋 MANUAL FIX REQUIRED\n')
console.log('The trigger function needs to be updated in your Supabase database.')
console.log('Follow these steps:\n')

console.log('1. Open your Supabase Dashboard:')
console.log(`   ${supabaseUrl.replace('/rest/v1', '').replace('https://', 'https://app.supabase.com/project/')}\n`)

console.log('2. Navigate to: SQL Editor (left sidebar)\n')

console.log('3. Click "New Query"\n')

console.log('4. Copy and paste this SQL:\n')
console.log('-'.repeat(60))

const SQL_FIX = `
-- Fix the trigger to use 'production' instead of 'won'
CREATE OR REPLACE FUNCTION handle_quote_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  quote_record RECORD;
BEGIN
  SELECT * INTO quote_record FROM quotes WHERE id = NEW.quote_id;
  
  UPDATE quotes
  SET status = 'accepted', accepted_at = NEW.signed_at, updated_at = NOW()
  WHERE id = NEW.quote_id;
  
  UPDATE leads
  SET status = 'production', quoted_amount = quote_record.total_amount, updated_at = NOW()
  WHERE id = quote_record.lead_id;
  
  UPDATE quotes
  SET status = 'declined', updated_at = NOW()
  WHERE lead_id = quote_record.lead_id
    AND id != NEW.quote_id
    AND status NOT IN ('accepted', 'declined');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

console.log(SQL_FIX)
console.log('-'.repeat(60))

console.log('\n5. Click "Run" (or press Ctrl+Enter)\n')

console.log('6. You should see "Success. No rows returned"\n')

console.log('7. Restart your Next.js dev server:\n')
console.log('   Stop the current server (Ctrl+C)')
console.log('   Run: npm run dev\n')

console.log('8. Try accepting the quote again!\n')

console.log('=' .repeat(60))
console.log('\n✨ After completing these steps, the signature system will work!\n')

