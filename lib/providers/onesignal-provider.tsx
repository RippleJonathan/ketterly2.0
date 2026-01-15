'use client'

import { useEffect } from 'react'
import OneSignal from 'react-onesignal'
import { createClient } from '@/lib/supabase/client'

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initOneSignal = async () => {
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
      
      if (!appId) {
        console.warn('OneSignal App ID not configured')
        return
      }

      // Only initialize on www.ketterly.com (as configured in OneSignal dashboard)
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        
        // Redirect non-www to www for consistency with OneSignal config
        if (hostname === 'ketterly.com') {
          console.log('OneSignal: Redirecting to www.ketterly.com for push notification support')
          window.location.href = 'https://www.ketterly.com' + window.location.pathname + window.location.search
          return
        }
        
        if (hostname !== 'www.ketterly.com' && hostname !== 'localhost') {
          console.log('OneSignal: Not initialized - domain not configured:', hostname)
          return
        }
      }

      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: {
            scope: '/',
          },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: {
            enable: false, // Disable default bell
          },
          welcomeNotification: {
            disable: true, // Disable welcome notification
          },
        })

        // Customize slidedown prompt
        await OneSignal.Slidedown.promptPush({
          text: {
            actionMessage: 'Get updates and notifications on leads and jobs.',
            acceptButton: 'Accept',
            cancelButton: 'No Thanks',
          },
          autoPrompt: false,
        })

        console.log('✅ OneSignal initialized successfully')

        // Get current user and set external user ID
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          try {
            console.log('🔑 Setting OneSignal user ID:', user.id)
            
            // Method 1: Use login (new SDK API)
            await OneSignal.login(user.id)
            console.log('✅ OneSignal.login() called')
            
            // Method 2: Use User.addAlias with custom label (not "external_id" which is reserved)
            try {
              await OneSignal.User.addAlias('supabase_user_id', user.id)
              console.log('✅ OneSignal.User.addAlias() called with supabase_user_id:', user.id)
            } catch (aliasError) {
              console.warn('⚠️  addAlias failed:', aliasError)
            }
            
            // Method 3: Use older setExternalUserId for backwards compatibility
            if (typeof (OneSignal as any).setExternalUserId === 'function') {
              await (OneSignal as any).setExternalUserId(user.id)
              console.log('✅ setExternalUserId() called')
            }
            
            // Give OneSignal a moment to process
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            // Try to verify using getExternalUserId (older API)
            try {
              if (typeof (OneSignal as any).getExternalUserId === 'function') {
                const externalId = await (OneSignal as any).getExternalUserId()
                console.log('🔍 External ID verification (old API):', externalId)
              }
            } catch (verifyError) {
              console.log('ℹ️  Could not verify external ID using old API')
            }
            
            // Check if user is subscribed
            const isSubscribed = await OneSignal.User.PushSubscription.optedIn
            console.log('🔔 Push subscription status:', isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED')
            
            if (!isSubscribed) {
              console.log('⚠️  User not subscribed to push notifications. Will prompt shortly...')
              setTimeout(() => {
                OneSignal.Slidedown.promptPush()
              }, 2000)
            } else {
              console.log('✅ Push notifications are enabled and ready')
              
              // Get both player ID and token to verify subscription
              const playerId = await OneSignal.User.PushSubscription.id
              const token = await OneSignal.User.PushSubscription.token
              
              console.log('📱 Your OneSignal Player ID:', playerId || 'Not available')
              console.log('🔑 Your OneSignal Token:', token ? 'Present ✅' : 'Missing ❌')
              
              // Only save player ID if we have both ID and token (confirming active subscription)
              if (playerId && token) {
                try {
                  // Check if user already has a player_id saved
                  const { data: existingUser } = await supabase
                    .from('users')
                    .select('onesignal_player_id')
                    .eq('id', user.id)
                    .single()
                  
                  // Detect if this is a mobile device (PWA or mobile browser)
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                  
                  // Determine if we should update:
                  // 1. No existing player_id → always update
                  // 2. Same player_id → update (refresh)
                  // 3. Mobile device → ALWAYS update (prefer mobile over desktop)
                  const shouldUpdate = !existingUser?.onesignal_player_id || 
                                      existingUser.onesignal_player_id === playerId ||
                                      isMobile
                  
                  if (shouldUpdate) {
                    const { error } = await supabase
                      .from('users')
                      .update({ onesignal_player_id: playerId })
                      .eq('id', user.id)
                    
                    if (error) {
                      console.error('❌ Failed to save player ID:', error)
                    } else {
                      const reason = isMobile && existingUser?.onesignal_player_id && existingUser.onesignal_player_id !== playerId
                        ? '(mobile device overwriting desktop)'
                        : '(subscription verified with token)'
                      console.log(`✅ Player ID saved to database ${reason}`)
                      if (existingUser?.onesignal_player_id && existingUser.onesignal_player_id !== playerId) {
                        console.log('   Previous:', existingUser.onesignal_player_id)
                        console.log('   New:', playerId)
                      }
                    }
                  } else {
                    console.log('ℹ️  Player ID already exists in database - not overwriting')
                    console.log('   Current device:', playerId)
                    console.log('   Saved in DB:', existingUser?.onesignal_player_id)
                  }
                } catch (dbError) {
                  console.error('❌ Database error saving player ID:', dbError)
                }
              } else if (playerId && !token) {
                console.warn('⚠️  Player ID exists but no token - subscription may not be fully active yet')
              }
            }
          } catch (error) {
            console.error('❌ Failed to set OneSignal user ID:', error)
          }
        } else {
          console.log('⚠️  No authenticated user - skipping OneSignal login')
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (subscription) => {
          console.log('🔔 Push subscription changed:', subscription)
          
          if (subscription.current.token && subscription.current.id) {
            console.log('✅ User subscribed with token:', subscription.current.token)
            console.log('📱 Player ID:', subscription.current.id)
            
            // Save player ID when subscription becomes active
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
              try {
                const { error } = await supabase
                  .from('users')
                  .update({ onesignal_player_id: subscription.current.id })
                  .eq('id', user.id)
                
                if (!error) {
                  console.log('✅ Player ID saved to database after subscription change')
                }
              } catch (err) {
                console.error('❌ Failed to save player ID on subscription change:', err)
              }
            }
          } else {
            console.log('❌ User unsubscribed')
          }
        })
        
        // Listen for notification clicks (deep linking)
        OneSignal.Notifications.addEventListener('click', (event) => {
          console.log('Notification clicked:', event)
          
          // Get the URL from the notification
          const url = event.notification.launchURL || event.notification.url
          
          if (url) {
            console.log('Opening notification URL:', url)
            // The URL will automatically be opened by OneSignal
            // But we can also handle it manually for SPA navigation
            if (url.includes(window.location.origin)) {
              // Internal URL - use client-side navigation
              const path = url.replace(window.location.origin, '')
              window.location.href = path
            }
          }
        })

        // Listen for auth state changes to update user ID
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await OneSignal.login(session.user.id)
            console.log('✅ OneSignal user ID updated on sign in')
          } else if (event === 'SIGNED_OUT') {
            await OneSignal.logout()
            console.log('✅ OneSignal user ID cleared on sign out')
          }
        })
      } catch (error) {
        console.error('OneSignal initialization error:', error)
      }
    }

    initOneSignal()
  }, [])

  return <>{children}</>
}
