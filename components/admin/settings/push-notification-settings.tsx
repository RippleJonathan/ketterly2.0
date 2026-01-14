'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import OneSignal from 'react-onesignal'
import { toast } from 'sonner'

export function PushNotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [oneSignalReady, setOneSignalReady] = useState(false)

  // Check if OneSignal is initialized and check subscription status
  useEffect(() => {
    const checkOneSignal = async () => {
      try {
        // Wait a bit for OneSignal to initialize
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if OneSignal is available
        if (typeof window !== 'undefined' && window.OneSignal) {
          setOneSignalReady(true)
          
          // Check current permission status
          const permission = await OneSignal.Notifications.permission
          setIsSubscribed(permission)
          console.log('OneSignal permission status:', permission)
        } else {
          console.warn('OneSignal not initialized')
          setOneSignalReady(false)
        }
      } catch (error) {
        console.error('Failed to check OneSignal status:', error)
        setOneSignalReady(false)
      }
    }
    
    checkOneSignal()
  }, [])

  const handleEnableNotifications = async () => {
    if (!oneSignalReady) {
      toast.error('Push notifications are not available. Please refresh the page.')
      return
    }

    setIsLoading(true)
    try {
      const permission = await OneSignal.Notifications.requestPermission()
      setIsSubscribed(permission)
      
      if (permission) {
        toast.success('Push notifications enabled!')
      } else {
        toast.error('Push notifications denied. Please enable them in your browser settings.')
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      toast.error('Failed to enable notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test-push', {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Test notification sent! Check your notifications.')
      } else {
        toast.error(result.error || 'Failed to send test notification')
      }
    } catch (error) {
      toast.error('Failed to send test notification')
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Get instant notifications in your browser for important updates
          </p>
        </div>

        <div className="space-y-4">
          {!oneSignalReady && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>Push notifications are not available on this domain. They work on ketterly.com.</span>
            </div>
          )}

          {oneSignalReady && isSubscribed === null && (
            <div className="text-sm text-gray-500">
              Checking notification status...
            </div>
          )}

          {oneSignalReady && isSubscribed === false && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <BellOff className="h-4 w-4" />
                <span>Push notifications are currently disabled</span>
              </div>
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Enabling...' : 'Enable Push Notifications'}
              </Button>
            </div>
          )}

          {oneSignalReady && isSubscribed === true && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Push notifications are enabled</span>
              </div>
              <Button
                onClick={handleTestNotification}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Send Test Notification
              </Button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">What you'll receive:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• New lead assignments</li>
            <li>• Quote approvals</li>
            <li>• Payment notifications</li>
            <li>• Important system updates</li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            You can disable notifications at any time in your browser settings
          </p>
        </div>
      </div>
    </Card>
  )
}
