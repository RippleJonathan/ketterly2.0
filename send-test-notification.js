/**
 * Send Test Notification to Specific Player
 */

const ONESIGNAL_APP_ID = '9bb827fa-d4a4-4827-a929-55f2750cfb59'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY
const PLAYER_ID = 'e9069b37-bd42-493a-bd6c-0889c105ce94'

async function sendTestNotification() {
  if (!ONESIGNAL_REST_API_KEY) {
    console.error('❌ ONESIGNAL_REST_API_KEY not set')
    return
  }

  const notification = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: '🧪 Test Notification' },
    contents: { en: 'This is a direct test from the diagnostic script!' },
    include_player_ids: [PLAYER_ID],
    url: 'https://ketterly.com/admin/dashboard',
  }

  console.log('\n🚀 Sending test notification...')
  console.log('Target Player ID:', PLAYER_ID)
  console.log('Notification:', JSON.stringify(notification, null, 2))

  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    })

    const result = await response.json()

    console.log('\n📬 OneSignal Response:')
    console.log(JSON.stringify(result, null, 2))
    console.log('\n📊 Key Metrics:')
    console.log(`- Success: ${response.ok ? 'YES ✅' : 'NO ❌'}`)
    console.log(`- Notification ID: ${result.id}`)
    console.log(`- Recipients: ${result.recipients ?? 'undefined'}`)
    console.log(`- External IDs: ${result.external_ids ?? 'undefined'}`)
    console.log(`- Errors: ${result.errors ? JSON.stringify(result.errors) : 'None'}`)

    if (response.ok) {
      if (result.recipients > 0) {
        console.log('\n✅ SUCCESS! Notification sent to device(s)')
        console.log('Check your device for the notification!')
      } else if (result.recipients === 0 || !result.recipients) {
        console.log('\n⚠️  WARNING: Notification accepted but recipients = 0 or undefined')
        console.log('Possible reasons:')
        console.log('1. User denied notification permission in browser')
        console.log('2. Service worker not properly registered')
        console.log('3. OneSignal SDK version mismatch')
        console.log('4. Device subscription expired/invalid')
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

sendTestNotification()
