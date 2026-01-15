/**
 * Clear onesignal_player_id from database
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const USER_ID = '6375ffe0-514e-41fc-b8cb-57699dcc9b4e'

async function clearPlayerIds() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials')
    console.log('Set: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('\n🧹 Clearing player_id from database...\n')

  const { error } = await supabase
    .from('users')
    .update({ onesignal_player_id: null })
    .eq('id', USER_ID)

  if (error) {
    console.error('❌ Failed:', error.message)
  } else {
    console.log('✅ Player ID cleared from database')
    console.log('\n📱 Next steps:')
    console.log('1. Delete all devices in OneSignal dashboard')
    console.log('2. Delete iPhone PWA app')
    console.log('3. Clear Safari website data for ketterly.com')
    console.log('4. Reinstall PWA on iPhone')
    console.log('5. Check console for new player_id')
    console.log('6. Verify in OneSignal dashboard that new device appears')
    console.log('7. Create test lead')
  }
}

clearPlayerIds()
