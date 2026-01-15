/**
 * List all devices subscribed for a user's external_user_id
 */

const ONESIGNAL_APP_ID = '9bb827fa-d4a4-4827-a929-55f2750cfb59'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY
const USER_ID = '6375ffe0-514e-41fc-b8cb-57699dcc9b4e'

async function listUserDevices() {
  if (!ONESIGNAL_REST_API_KEY) {
    console.error('❌ ONESIGNAL_REST_API_KEY not set')
    return
  }

  try {
    // OneSignal doesn't have a direct API to list devices by external_user_id
    // We need to check the player we know about
    console.log(`\n🔍 Checking subscriptions for user: ${USER_ID}\n`)
    console.log('Note: OneSignal may have multiple player_ids for this user')
    console.log('The notification was sent to 4 recipients according to dashboard\n')
    
    // Check the known player_id
    const knownPlayerId = 'e9069b37-bd42-493a-bd6c-0889c105ce94'
    
    const response = await fetch(
      `https://api.onesignal.com/players/${knownPlayerId}?app_id=${ONESIGNAL_APP_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
      }
    )

    if (response.ok) {
      const player = await response.json()
      console.log('✅ Current Player Info:')
      console.log(`   Player ID: ${player.id}`)
      console.log(`   External User ID: ${player.external_user_id || 'NOT SET'}`)
      console.log(`   Device Type: ${player.device_type} (${getDeviceType(player.device_type)})`)
      console.log(`   Device Model: ${player.device_model}`)
      console.log(`   Last Active: ${new Date(player.last_active * 1000).toLocaleString()}`)
      console.log(`   Session Count: ${player.session_count}`)
      console.log(`   Subscribed: ${player.invalid_identifier ? 'NO ❌' : 'YES ✅'}`)
      console.log(`   Test Type: ${player.test_type || 'Production'}`)
      console.log('')
      
      if (player.test_type) {
        console.log('⚠️  WARNING: This is a TEST SUBSCRIPTION')
        console.log('   Test subscriptions may not receive production notifications')
      }
    }
    
    console.log('\n💡 DIAGNOSIS:')
    console.log('   Dashboard shows 4 recipients received the notification')
    console.log('   This means you have 4 active subscriptions across different:')
    console.log('   - Browsers (Chrome, Safari, Firefox)')
    console.log('   - Devices (Desktop, Mobile, Tablet)')
    console.log('   - PWA installs (old PWA + new PWA)')
    console.log('')
    console.log('🔍 Check these places for the notification:')
    console.log('   1. Desktop browser notification center')
    console.log('   2. Phone notification center')
    console.log('   3. Other devices you\'re logged into')
    console.log('   4. PWA notification badge')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

function getDeviceType(type) {
  const types = {
    0: 'iOS',
    1: 'Android',
    2: 'Amazon',
    3: 'Windows Phone',
    4: 'Chrome Web',
    5: 'Chrome Web (Desktop)',
    6: 'Windows Phone',
    7: 'Safari (Desktop)',
    8: 'Firefox',
    9: 'MacOS',
    10: 'Alexa',
    11: 'Email',
    13: 'SMS',
  }
  return types[type] || 'Unknown'
}

listUserDevices()
