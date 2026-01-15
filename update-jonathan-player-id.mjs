import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ofwbaxfxhoefbyfhgaph.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const userId = '6375ffe0-514e-41fc-b8cb-57699dcc9b4e'
const newPlayerId = '5012e803-e6d7-45a9-abc1-a52855461512'

console.log('📱 Updating Jonathan\'s player_id...')
console.log('User ID:', userId)
console.log('New Player ID:', newPlayerId)

const { data, error } = await supabase
  .from('users')
  .update({ onesignal_player_id: newPlayerId })
  .eq('id', userId)
  .select()

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('✅ Jonathan\'s player_id updated successfully!')
console.log('Updated record:', data)
