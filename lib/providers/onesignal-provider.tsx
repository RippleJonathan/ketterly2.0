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

      // Only initialize OneSignal on allowed domains
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const isAllowedDomain = 
        hostname === 'ketterly.com' || 
        hostname === 'www.ketterly.com' ||
        hostname.endsWith('.vercel.app') ||
        hostname === 'localhost'

      if (!isAllowedDomain) {
        console.warn('OneSignal: Domain not configured -', hostname)
        return
      }

      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true, // For local development
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
