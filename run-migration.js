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
  console.log('Running migrations: add flat_squares and steep_slopes columns...\n')
  
  // Migration 1: Add flat_squares
  const flatSquaresSQL = `
    ALTER TABLE public.lead_measurements
    ADD COLUMN IF NOT EXISTS flat_squares DECIMAL(10,2);

    COMMENT ON COLUMN public.lead_measurements.flat_squares IS 'Flat roof area in squares (no pitch multiplier applied). Used to dynamically calculate actual_squares when pitch changes.';
  `

  // Migration 2: Add steep slope tracking
  const steepSlopesSQL = `
    ALTER TABLE public.lead_measurements
    ADD COLUMN IF NOT EXISTS steep_7_12_squares DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS steep_8_12_squares DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS steep_9_12_squares DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS steep_10_12_squares DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS steep_11_12_squares DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS steep_12_plus_squares DECIMAL(10,2);

    COMMENT ON COLUMN public.lead_measurements.steep_7_12_squares IS 'Roof area with 7/12 pitch in squares';
    COMMENT ON COLUMN public.lead_measurements.steep_8_12_squares IS 'Roof area with 8/12 pitch in squares';
    COMMENT ON COLUMN public.lead_measurements.steep_9_12_squares IS 'Roof area with 9/12 pitch in squares';
    COMMENT ON COLUMN public.lead_measurements.steep_10_12_squares IS 'Roof area with 10/12 pitch in squares';
    COMMENT ON COLUMN public.lead_measurements.steep_11_12_squares IS 'Roof area with 11/12 pitch in squares';
    COMMENT ON COLUMN public.lead_measurements.steep_12_plus_squares IS 'Roof area with 12/12+ pitch in squares (very steep)';
  `

  try {
    // Run flat_squares migration
    console.log('1/2 Adding flat_squares column...')
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: flatSquaresSQL })
    
    if (error1) {
      console.error('❌ flat_squares migration failed:', error1)
      process.exit(1)
    }
    console.log('✅ flat_squares column added\n')

    // Run steep slopes migration
    console.log('2/2 Adding steep slope tracking columns...')
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: steepSlopesSQL })
    
    if (error2) {
      console.error('❌ steep_slopes migration failed:', error2)
      process.exit(1)
    }
    console.log('✅ Steep slope columns added (7/12, 8/12, 9/12, 10/12, 11/12, 12+)\n')

    console.log('🎉 All migrations completed successfully!')
    console.log('\nColumns added to lead_measurements table:')
    console.log('  - flat_squares (for dynamic pitch calculation)')
    console.log('  - steep_7_12_squares through steep_12_plus_squares (for pricing)')
  } catch (err) {
    console.error('Error running migrations:', err)
    process.exit(1)
  }
}

runMigration()
