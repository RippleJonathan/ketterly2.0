/**
 * Add parent_activity_id column to activities table
 * Run this to enable threaded notes/replies
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  console.log('🔧 Adding parent_activity_id column to activities table...\n')
  
  try {
    // Read the migration file
    const migrationSQL = readFileSync(
      join(__dirname, 'supabase/migrations/20260115_add_parent_activity_id.sql'),
      'utf-8'
    )
    
    console.log('Migration SQL:')
    console.log(migrationSQL)
    console.log('\n' + '='.repeat(60) + '\n')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      return
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('\nVerifying column was added...')
    
    // Verify the column exists
    const { data: columns, error: verifyError } = await supabase
      .from('activities')
      .select('parent_activity_id')
      .limit(1)
    
    if (verifyError) {
      console.error('⚠️  Could not verify column:', verifyError)
    } else {
      console.log('✅ Column verified: parent_activity_id exists')
    }
    
    console.log('\n✅ Ready to use threaded notes!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

runMigration().catch(console.error)
