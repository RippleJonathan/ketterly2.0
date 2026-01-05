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
  // Get migration file path from command line argument
  const migrationFileArg = process.argv[2]
  
  if (!migrationFileArg) {
    console.error('❌ Please provide a migration file path')
    console.error('Usage: node run-migration.js <migration-file-path>')
    console.error('Example: node run-migration.js supabase/migrations/20260104000001_commission_enhancements.sql')
    process.exit(1)
  }
  
  // Resolve the migration path
  const migrationPath = path.isAbsolute(migrationFileArg) 
    ? migrationFileArg 
    : path.join(__dirname, migrationFileArg)
  
  // Check if file exists
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  // Get migration name from file
  const migrationFileName = path.basename(migrationPath)
  console.log(`\n🚀 Running migration: ${migrationFileName}\n`)
  
  // Read the migration file
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  try {
    console.log('Applying migration...')
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration applied successfully!\n')
    console.log('🎉 Migration completed!')
  } catch (err) {
    console.error('❌ Error running migration:', err)
    process.exit(1)
  }
}

runMigration()
