/**
 * Add flat_squares column to lead_measurements table
 * Run with: node add-flat-squares.js
 */

import('dotenv/config')
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('Adding flat_squares column to lead_measurements table...')

  // Just run a simple update to test - the actual column can be added via Supabase dashboard
  const { data, error } = await supabase
    .from('lead_measurements')
    .select('id, actual_squares')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('✅ Database connection successful')
  console.log('Please add the flat_squares column via Supabase Dashboard:')
  console.log('1. Go to Supabase Dashboard > SQL Editor')
  console.log('2. Run the following SQL:')
  console.log('')
  console.log('ALTER TABLE public.lead_measurements ADD COLUMN IF NOT EXISTS flat_squares DECIMAL(10,2);')
  console.log('')
  console.log('Or copy the SQL from: supabase/migrations/20241204000001_add_flat_squares.sql')
  process.exit(0)
})
