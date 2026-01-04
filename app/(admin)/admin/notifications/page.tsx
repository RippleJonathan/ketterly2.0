'use client'

import { useState } from 'react'
import { Bell, Check, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNotifications, useMarkNotificationRead, useDeleteNotification } from '@/lib/hooks/use-notifications'

const notificationTypes = {
  lead: { label: 'Leads', color: 'bg-blue-100 text-blue-800' },
  quote: { label: 'Quotes', color: 'bg-green-100 text-green-800' },
  payment: { label: 'Payments', color: 'bg-purple-100 text-purple-800' },
  calendar: { label: 'Calendar', color: 'bg-orange-100 text-orange-800' },
  project: { label: 'Projects', color: 'bg-indigo-100 text-indigo-800' },
  commission: { label: 'Commission', color: 'bg-yellow-100 text-yellow-800' },
  company: { label: 'Company', color: 'bg-red-100 text-red-800' },
  system: { label: 'System', color: 'bg-gray-100 text-gray-800' },
  location: { label: 'Location', color: 'bg-teal-100 text-teal-800' },
  user: { label: 'User', color: 'bg-pink-100 text-pink-800' }
}

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-800'
}

export default function NotificationsPage() {
  const { data: notificationsResponse, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const deleteNotification = useDeleteNotification()

  const notifications = notificationsResponse?.data || []

  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const markAsRead = async (id: string) => {
    await markRead.mutateAsync(id)
  }

  const markAllAsRead = async () => {
    // Mark all unread notifications as read
    const unreadNotifications = notifications.filter(n => !n.is_read)
    await Promise.all(unreadNotifications.map(n => markRead.mutateAsync(n.id)))
  }

  const removeNotification = async (id: string) => {
    await deleteNotification.mutateAsync(id)
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.is_read
    return notification.type === filter
  })

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return 0
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your latest activities and updates
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" disabled={markRead.isPending}>
            <Check className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filter:</span>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="lead">Leads</SelectItem>
                    <SelectItem value="quote">Quotes</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                    <SelectItem value="project">Projects</SelectItem>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              {unreadCount > 0 && ` (${unreadCount} unread)`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : sortedNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? "You're all caught up! Check back later for new updates."
                  : `No ${filter} notifications found.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedNotifications.map((notification) => (
            <Card key={notification.id} className={`transition-colors ${!notification.is_read ? 'bg-blue-50 border-blue-200' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-semibold truncate ${
                        !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-gray-600 mb-3">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={notificationTypes[notification.type]?.color}>
                        {notificationTypes[notification.type]?.label}
                      </Badge>
                      <Badge variant="outline" className={priorityColors[notification.priority]}>
                        {notification.priority} priority
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        disabled={markRead.isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      disabled={deleteNotification.isPending}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}