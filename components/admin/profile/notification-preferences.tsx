'use client'

import { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, Smartphone, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface NotificationGroup {
  title: string
  description: string
  items: {
    key: string
    label: string
    description: string
  }[]
}

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    title: 'Leads & Customers',
    description: 'Stay updated on new leads and customer interactions',
    items: [
      { key: 'new_leads', label: 'New Leads', description: 'When a new lead is created or assigned to you' },
      { key: 'new_note', label: 'New Notes', description: 'When someone adds a note to your leads' },
    ]
  },
]

export function NotificationPreferences() {
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Leads & Customers'])

  const [masterToggles, setMasterToggles] = useState({
    email_notifications: user?.email_notifications ?? true,
    push_notifications: user?.push_notifications ?? false,
    sms_notifications: user?.sms_notifications ?? false,
  })

  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    user?.notification_preferences || {}
  )

  // Update preferences when user data loads
  useEffect(() => {
    if (user?.notification_preferences) {
      setPreferences(user.notification_preferences)
    }
    if (user) {
      setMasterToggles({
        email_notifications: user.email_notifications ?? true,
        push_notifications: user.push_notifications ?? false,
        sms_notifications: user.sms_notifications ?? false,
      })
    }
  }, [user])

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    )
  }

  const toggleAllInGroup = (group: NotificationGroup, enabled: boolean) => {
    const updates: Record<string, boolean> = {}
    group.items.forEach(item => {
      updates[item.key] = enabled
    })
    setPreferences({ ...preferences, ...updates })
  }

  const handleSave = async () => {
    if (!user?.id) return

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...masterToggles,
          notification_preferences: preferences,
        })
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
    masterToggles.email_notifications !== user?.email_notifications ||
    masterToggles.push_notifications !== user?.push_notifications ||
    masterToggles.sms_notifications !== user?.sms_notifications ||
    JSON.stringify(preferences) !== JSON.stringify(user?.notification_preferences || {})

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-500" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
        <CardDescription>
          Choose how and when you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Notification Channels</h3>
          
          {/* Email Notifications */}
          <div className="flex items-center justify-between space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-4 flex-1">
              <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="space-y-1 flex-1">
                <Label htmlFor="email-notifications" className="text-base font-medium cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Receive notifications via email at {user?.email}
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={masterToggles.email_notifications}
              onCheckedChange={(checked) =>
                setMasterToggles({ ...masterToggles, email_notifications: checked })
              }
            />
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between space-x-4 p-3 bg-gray-50 rounded-lg opacity-60">
            <div className="flex items-start space-x-4 flex-1">
              <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="space-y-1 flex-1">
                <Label className="text-base font-medium">
                  SMS Notifications <span className="text-xs text-blue-600 font-normal">Coming Soon</span>
                </Label>
                <p className="text-sm text-gray-500">
                  Receive text messages for critical alerts
                </p>
              </div>
            </div>
            <Switch
              disabled
              checked={false}
            />
          </div>
        </div>

        <Separator />

        {/* Granular Preferences */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">What to Notify Me About</h3>
          <p className="text-sm text-gray-500">
            Choose which events you want to be notified about (applies to all enabled channels)
          </p>

          {NOTIFICATION_GROUPS.map((group) => {
            const isExpanded = expandedGroups.includes(group.title)
            const allEnabled = group.items.every(item => preferences[item.key] !== false)
            const someEnabled = group.items.some(item => preferences[item.key] !== false)

            return (
              <div key={group.title} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{group.title}</h4>
                      {someEnabled && !allEnabled && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Partial
                        </span>
                      )}
                      {allEnabled && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          All On
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Group Items */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {/* Toggle All */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Select All</span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllInGroup(group, true)}
                        >
                          Enable All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllInGroup(group, false)}
                        >
                          Disable All
                        </Button>
                      </div>
                    </div>

                    {/* Individual Items */}
                    <div className="p-4 space-y-4">
                      {group.items.map((item) => (
                        <div key={item.key} className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                              {item.label}
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.description}
                            </p>
                          </div>
                          <Switch
                            id={item.key}
                            checked={preferences[item.key] !== false}
                            onCheckedChange={(checked) =>
                              setPreferences({ ...preferences, [item.key]: checked })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
