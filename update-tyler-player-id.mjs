import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ofwbaxfxhoefbyfhgaph.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const userId = '7ae76e21-a3f2-4ff0-9267-9d80e2f1da90'
const newPlayerId = '6f506f10-5620-468d-b096-12fddd4347cf'

console.log('📱 Updating Tyler\'s player_id...')
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

console.log('✅ Tyler\'s player_id updated successfully!')
console.log('Updated record:', data)
