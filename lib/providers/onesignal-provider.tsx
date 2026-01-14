'use client'

import { useEffect } from 'react'
import OneSignal from 'react-onesignal'
import { createClient } from '@/lib/supabase/client'

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initOneSignal = async () => {
      // Temporarily disable OneSignal - causing domain configuration issues
      // Will re-enable once OneSignal dashboard is properly configured
      console.log('OneSignal: Disabled until dashboard configuration is verified')
      return

      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
      
      if (!appId) {
        console.warn('OneSignal App ID not configured')
        return
      }

      // Only allow ketterly.com and localhost
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const isAllowed = hostname === 'ketterly.com' || 
                         hostname === 'www.ketterly.com' || 
                         hostname === 'localhost'
        
        if (!isAllowed) {
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
          serviceWorkerPath: '/OneSignalSDK.sw.js',
        })

        console.log('✅ OneSignal initialized successfully')

        // Get current user and set external user ID
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          await OneSignal.login(user.id)
          console.log('✅ OneSignal user ID set:', user.id)
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
