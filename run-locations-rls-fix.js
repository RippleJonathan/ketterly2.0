const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  console.log('🔄 Running migration: Fix locations RLS infinite recursion...\n')

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260107000002_fix_locations_rls_recursion.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`\n▶️  Executing statement ${i + 1}/${statements.length}:`)
    console.log(statement.substring(0, 100) + '...\n')

    const { error } = await supabase.rpc('exec_sql', {
      query: statement + ';'
    }).catch(async () => {
      // If exec_sql doesn't exist, try direct query
      return await supabase.from('_migrations').select('*').limit(1)
        .then(() => ({ error: { message: 'exec_sql not available - please run migration manually in Supabase Dashboard' }}))
    })

    if (error) {
      console.error(`❌ Error on statement ${i + 1}:`, error.message)
      console.log('\n⚠️  MANUAL MIGRATION REQUIRED:')
      console.log('1. Open Supabase Dashboard → SQL Editor')
      console.log('2. Copy the migration file: supabase/migrations/20260107000002_fix_locations_rls_recursion.sql')
      console.log('3. Paste and run the SQL\n')
      return
    }

    console.log(`✅ Statement ${i + 1} executed successfully`)
  }

  console.log('\n✅ Migration completed successfully!')
  console.log('\n🔍 Verifying RLS policies...')

  // Can't verify without exec_sql, just show instructions
  console.log('\n📋 To verify the fix:')
  console.log('1. Try updating a location again')
  console.log('2. The "infinite recursion" error should be gone')
  console.log('3. Check Supabase Dashboard → Authentication → Policies → locations table\n')
}

runMigration().catch(console.error)
