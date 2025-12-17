'use client'

import { useState } from 'react'
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function NotificationPreferences() {
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const [preferences, setPreferences] = useState({
    email_notifications: user?.email_notifications ?? true,
    push_notifications: user?.push_notifications ?? false,
    sms_notifications: user?.sms_notifications ?? false,
  })

  const handleSave = async () => {
    if (!user?.id) return

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update(preferences)
        .eq('id', user.id)

      if (error) throw error

      // Invalidate user cache to refresh
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      
      toast.success('Notification preferences saved!')
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = 
    preferences.email_notifications !== user?.email_notifications ||
    preferences.push_notifications !== user?.push_notifications ||
    preferences.sms_notifications !== user?.sms_notifications

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-500" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
        <CardDescription>
          Choose how you want to receive notifications about leads, tasks, and updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-4 flex-1">
            <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="space-y-1 flex-1">
              <Label htmlFor="email-notifications" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-gray-500">
                Receive email notifications for new leads, task assignments, and important updates.
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.email_notifications}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, email_notifications: checked })
            }
          />
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-4 flex-1">
            <Smartphone className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="space-y-1 flex-1">
              <Label htmlFor="push-notifications" className="text-base font-medium">
                Push Notifications
              </Label>
              <p className="text-sm text-gray-500">
                Get real-time push notifications on your device for urgent updates.
              </p>
              {preferences.push_notifications && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Push notifications require browser permission. You may be prompted to allow notifications.
                </p>
              )}
            </div>
          </div>
          <Switch
            id="push-notifications"
            checked={preferences.push_notifications}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, push_notifications: checked })
            }
          />
        </div>

        {/* SMS Notifications */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-4 flex-1">
            <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="space-y-1 flex-1">
              <Label htmlFor="sms-notifications" className="text-base font-medium">
                SMS Notifications
              </Label>
              <p className="text-sm text-gray-500">
                Receive text messages for critical alerts and time-sensitive updates.
              </p>
              {preferences.sms_notifications && user?.phone && (
                <p className="text-xs text-gray-500 mt-2">
                  SMS will be sent to: {user.phone}
                </p>
              )}
            </div>
          </div>
          <Switch
            id="sms-notifications"
            checked={preferences.sms_notifications}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, sms_notifications: checked })
            }
          />
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
