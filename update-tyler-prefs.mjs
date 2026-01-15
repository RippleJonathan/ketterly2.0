/**
 * Update Tyler's notification preferences
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateTylerPreferences() {
  const { data: tyler } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'tyler@rippleroofs.com')
    .single()
  
  console.log('Updating preferences for:', tyler.email)
  
  const updatedPrefs = {
    ...tyler.notification_preferences,
    new_note: true,
    appointment_scheduled: true,
    quote_sent: true,
    quote_approved: true,
    contract_signed: true,
    invoice_overdue: true,
  }
  
  await supabase
    .from('users')
    .update({ notification_preferences: updatedPrefs })
    .eq('id', tyler.id)
  
  console.log('✅ Tyler\'s preferences updated')
}

updateTylerPreferences().catch(console.error)
