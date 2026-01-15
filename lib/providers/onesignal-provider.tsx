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
              const playerId = await OneSignal.User.PushSubscription.id
              console.log('📱 Your OneSignal Player ID:', playerId || 'Not available')
              
              // Save player ID to database for push notification targeting
              if (playerId) {
                try {
                  const { error } = await supabase
                    .from('users')
                    .update({ onesignal_player_id: playerId })
                    .eq('id', user.id)
                  
                  if (error) {
                    console.error('❌ Failed to save player ID:', error)
                  } else {
                    console.log('✅ Player ID saved to database')
                  }
                } catch (dbError) {
                  console.error('❌ Database error saving player ID:', dbError)
                }
              }
            }
          } catch (error) {
            console.error('❌ Failed to set OneSignal user ID:', error)
          }
        } else {
          console.log('⚠️  No authenticated user - skipping OneSignal login')
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', (subscription) => {
          console.log('Push subscription changed:', subscription)
          
          if (subscription.current.token) {
            console.log('User subscribed with token:', subscription.current.token)
          } else {
            console.log('User unsubscribed')
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
