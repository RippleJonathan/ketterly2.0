/**
 * Manually set the correct player_id (iPhone PWA)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ofwbaxfxhoefbyfhgaph.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const USER_ID = '6375ffe0-514e-41fc-b8cb-57699dcc9b4e'
const IPHONE_PWA_PLAYER_ID = 'baa41943-0b0f-413e-a7b7-2c3a0f35480a' // From OneSignal dashboard

async function setCorrectPlayerId() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials')
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('\n📱 Setting iPhone PWA player_id...\n')
  console.log('User ID:', USER_ID)
  console.log('Player ID:', IPHONE_PWA_PLAYER_ID)

  const { error } = await supabase
    .from('users')
    .update({ onesignal_player_id: IPHONE_PWA_PLAYER_ID })
    .eq('id', USER_ID)

  if (error) {
    console.error('❌ Failed:', error.message)
  } else {
    console.log('\n✅ iPhone PWA player_id set successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Deploy the updated code (prevents desktop from overwriting)')
    console.log('2. Block notifications on desktop browser')
    console.log('3. Create a test lead from desktop')
    console.log('4. Check iPhone for notification')
  }
}

setCorrectPlayerId()
