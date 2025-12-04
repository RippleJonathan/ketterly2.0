/**
 * Script to add flat_squares column to lead_measurements table
 * Run this with: node run-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Running migration: add flat_squares column...')
  
  const migrationSQL = `
    ALTER TABLE public.lead_measurements
    ADD COLUMN IF NOT EXISTS flat_squares DECIMAL(10,2);

    COMMENT ON COLUMN public.lead_measurements.flat_squares IS 'Flat roof area in squares (no pitch multiplier applied). Used to dynamically calculate actual_squares when pitch changes.';
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration successful!')
    console.log('flat_squares column added to lead_measurements table')
  } catch (err) {
    console.error('Error running migration:', err)
    process.exit(1)
  }
}

runMigration()
