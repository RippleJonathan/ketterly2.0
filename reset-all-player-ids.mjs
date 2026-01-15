import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ofwbaxfxhoefbyfhgaph.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔄 Resetting all player IDs to NULL...')

const { data, error } = await supabase
  .from('users')
  .update({ onesignal_player_id: null })
  .in('id', [
    '6375ffe0-514e-41fc-b8cb-57699dcc9b4e', // Jonathan
    '7ae76e21-a3f2-4ff0-9267-9d80e2f1da90'  // Tyler
  ])
  .select('id, full_name, onesignal_player_id')

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('✅ All player IDs reset to NULL!')
console.log('Updated users:', data)
console.log('\n📱 Next steps:')
console.log('1. Delete all subscriptions in OneSignal dashboard')
console.log('2. Have each user open their PWA app')
console.log('3. Accept notification permissions when prompted')
console.log('4. Player IDs will auto-save to database')
console.log('5. Test with a new lead assignment')
