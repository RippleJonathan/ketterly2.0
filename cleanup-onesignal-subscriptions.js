/**
 * Cleanup old OneSignal subscriptions
 * This script will help you find and delete old player subscriptions
 */

const ONESIGNAL_APP_ID = '9bb827fa-d4a4-4827-a929-55f2750cfb59'
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

// Known player IDs - add any others you find
const PLAYER_IDS_TO_DELETE = [
  'e9069b37-bd42-493a-bd6c-0889c105ce94', // Desktop Chrome
  // Add more player IDs here if you find them
]

async function deletePlayer(playerId) {
  try {
    const response = await fetch(
      `https://api.onesignal.com/players/${playerId}?app_id=${ONESIGNAL_APP_ID}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
      }
    )

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Deleted player: ${playerId}`)
      return true
    } else {
      const error = await response.json()
      console.error(`❌ Failed to delete ${playerId}:`, error)
      return false
    }
  } catch (error) {
    console.error(`❌ Error deleting ${playerId}:`, error.message)
    return false
  }
}

async function cleanupSubscriptions() {
  if (!ONESIGNAL_REST_API_KEY) {
    console.error('❌ ONESIGNAL_REST_API_KEY not set')
    console.log('Run: $env:ONESIGNAL_REST_API_KEY="your_key"')
    return
  }

  console.log('\n🧹 Cleaning up OneSignal subscriptions...\n')
  console.log(`Found ${PLAYER_IDS_TO_DELETE.length} player(s) to delete\n`)

  for (const playerId of PLAYER_IDS_TO_DELETE) {
    await deletePlayer(playerId)
  }

  console.log('\n✅ Cleanup complete!')
  console.log('\n📱 Next steps:')
  console.log('1. Hard refresh your browser (Ctrl+Shift+R)')
  console.log('2. Clear browser data for ketterly.com (cookies, cache, service workers)')
  console.log('3. Visit ketterly.com again')
  console.log('4. Accept the notification permission prompt')
  console.log('5. Check console for new player ID')
  console.log('6. Create a test lead to verify notifications work')
}

cleanupSubscriptions()
