'use client'

import { useState } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import OneSignal from 'react-onesignal'
import { toast } from 'sonner'

export function PushNotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check subscription status on mount
  useState(() => {
    const checkSubscription = async () => {
      try {
        const permission = await OneSignal.Notifications.permission
        setIsSubscribed(permission)
      } catch (error) {
        console.error('Failed to check subscription:', error)
      }
    }
    checkSubscription()
  })

  const handleEnableNotifications = async () => {
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
          {isSubscribed === null && (
            <div className="text-sm text-gray-500">
              Checking notification status...
            </div>
          )}

          {isSubscribed === false && (
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
                Enable Push Notifications
              </Button>
            </div>
          )}

          {isSubscribed === true && (
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
