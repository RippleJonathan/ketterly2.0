/**
 * Check OneSignal Player Status
 * This script queries the OneSignal REST API to check if a player_id is registered
 */

const ONESIGNAL_APP_ID = '9bb827fa-d4a4-4827-a929-55f2750cfb59'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

// From your logs
const PLAYER_ID = 'e9069b37-bd42-493a-bd6c-0889c105ce94'

async function checkPlayerStatus() {
  if (!ONESIGNAL_REST_API_KEY) {
    console.error('❌ ONESIGNAL_REST_API_KEY not set in environment')
    console.log('Run: $env:ONESIGNAL_REST_API_KEY="your_key"')
    return
  }

  try {
    console.log(`\n🔍 Checking player status for: ${PLAYER_ID}\n`)

    const response = await fetch(
      `https://api.onesignal.com/players/${PLAYER_ID}?app_id=${ONESIGNAL_APP_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ OneSignal API Error:', response.status, response.statusText)
      console.error('Response:', JSON.stringify(data, null, 2))
      
      if (response.status === 404) {
        console.log('\n⚠️  PLAYER NOT FOUND')
        console.log('This means the player_id is not registered in OneSignal yet.')
        console.log('\nPossible reasons:')
        console.log('1. Subscription not fully synced with OneSignal servers')
        console.log('2. Device needs to be refreshed to complete subscription')
        console.log('3. Service worker registration incomplete')
      }
      return
    }

    console.log('✅ Player found in OneSignal!\n')
    console.log('Player Details:')
    console.log('================')
    console.log(JSON.stringify(data, null, 2))
    console.log('\nKey Fields:')
    console.log(`- ID: ${data.id}`)
    console.log(`- External User ID: ${data.external_user_id || 'NOT SET ❌'}`)
    console.log(`- Tags: ${JSON.stringify(data.tags)}`)
    console.log(`- Created: ${data.created_at}`)
    console.log(`- Last Active: ${data.last_active}`)
    console.log(`- Session Count: ${data.session_count}`)
    console.log(`- Subscribed: ${data.notification_types !== -1 ? 'YES ✅' : 'NO ❌'}`)
    console.log(`- Valid Subscription: ${data.invalid_identifier ? 'NO ❌' : 'YES ✅'}`)

  } catch (error) {
    console.error('❌ Error checking player status:', error.message)
  }
}

checkPlayerStatus()
