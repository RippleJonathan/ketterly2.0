/**
 * Test notification with external_user_id
 */

const ONESIGNAL_APP_ID = '9bb827fa-d4a4-4827-a929-55f2750cfb59'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY
const USER_ID = '6375ffe0-514e-41fc-b8cb-57699dcc9b4e' // Your Supabase user ID

async function sendTestWithExternalId() {
  if (!ONESIGNAL_REST_API_KEY) {
    console.error('❌ ONESIGNAL_REST_API_KEY not set')
    return
  }

  const notification = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: '🧪 Test with External ID' },
    contents: { en: 'Testing with include_external_user_ids!' },
    include_external_user_ids: [USER_ID],
    url: 'https://ketterly.com/admin/dashboard',
  }

  console.log('\n🚀 Sending test notification with external_user_id...')
  console.log('Target User ID:', USER_ID)
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
    console.log(`- Errors: ${result.errors ? JSON.stringify(result.errors) : 'None'}`)

    if (response.ok) {
      if (result.recipients > 0) {
        console.log('\n✅ SUCCESS! Notification sent to', result.recipients, 'device(s)')
        console.log('🎯 Check your browser for the notification!')
      } else {
        console.log('\n⚠️  Notification accepted but recipients =', result.recipients || 'undefined')
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

sendTestWithExternalId()
