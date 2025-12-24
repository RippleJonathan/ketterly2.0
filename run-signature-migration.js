// Run signature RPC migration
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  const sql = readFileSync('supabase/migrations/20241224000001_add_signature_rpc.sql', 'utf8')
  
  console.log('Running signature RPC migration...\n')
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })
  
  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Signature RPC function created successfully!')
  }
}

runMigration()
