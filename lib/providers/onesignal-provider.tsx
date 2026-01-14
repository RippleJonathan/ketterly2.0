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
            // Use both methods for compatibility
            await OneSignal.login(user.id)
            console.log('✅ OneSignal.login() called with ID:', user.id)
            
            // Also use the older setExternalUserId method for backwards compatibility
            if (typeof (OneSignal as any).setExternalUserId === 'function') {
              await (OneSignal as any).setExternalUserId(user.id)
              console.log('✅ setExternalUserId() called with ID:', user.id)
            }
            
            // Give OneSignal a moment to process
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Verify external ID was set
            const externalId = await OneSignal.User.getExternalId()
            console.log('✅ OneSignal external ID verified:', externalId || 'NOT SET')
            
            if (!externalId) {
              console.error('❌ External ID not set! This will prevent push notifications from targeting this user.')
            }
            
            // Check if user is subscribed
            const isSubscribed = await OneSignal.User.PushSubscription.optedIn
            console.log('🔔 Push subscription status:', isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED')
            
            if (!isSubscribed) {
              console.log('⚠️  User not subscribed to push notifications. Will prompt shortly...')
              // Auto-prompt for push notifications
              setTimeout(() => {
                OneSignal.Slidedown.promptPush()
              }, 2000)
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
