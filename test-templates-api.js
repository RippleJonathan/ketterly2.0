// Test document templates API
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testAPI() {
  console.log('Testing document templates API...\n')
  
  // Test getting templates
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .is('deleted_at', null)
  
  console.log('Query result:')
  console.log('Error:', error)
  console.log('Data count:', data?.length)
  console.log('Data:', JSON.stringify(data, null, 2))
}

testAPI()
