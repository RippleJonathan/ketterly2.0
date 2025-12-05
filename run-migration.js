/**
 * Script to run database migrations via exec_sql RPC
 * Run this with: node run-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  console.error('Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Running migration: Fix measurement_accessories foreign key...\n')
  
  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241205000005_fix_measurement_accessories_fk.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  try {
    console.log('Applying foreign key constraint fix...')
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Foreign key constraint added successfully!\n')
    console.log('🎉 Migration completed!')
    console.log('\nThe measurement_accessories table now has a proper foreign key to materials.')
    console.log('You can now add accessories in the Measurements tab without errors.')
  } catch (err) {
    console.error('Error running migration:', err)
    process.exit(1)
  }
}

runMigration()
