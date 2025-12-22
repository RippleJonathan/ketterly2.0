'use client'

import { useUpcomingEvents } from '@/lib/hooks/use-dashboard'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface UpcomingScheduleProps {
  myEventsOnly?: boolean
  limit?: number
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  consultation: { label: 'Consultation', color: 'bg-blue-500' },
  production_materials: { label: 'Materials Delivery', color: 'bg-green-500' },
  production_labor: { label: 'Installation', color: 'bg-orange-500' },
  adjuster_meeting: { label: 'Adjuster Meeting', color: 'bg-red-500' },
  other: { label: 'Other', color: 'bg-purple-500' },
}

export function UpcomingSchedule({ myEventsOnly = false, limit = 5 }: UpcomingScheduleProps) {
  const { data: events, isLoading } = useUpcomingEvents(myEventsOnly, limit)

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {myEventsOnly ? 'My Schedule' : 'Upcoming Schedule'}
        </h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {myEventsOnly ? 'My Schedule' : 'Upcoming Schedule'}
          </h2>
          <Link
            href="/admin/calendar"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all →
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No upcoming events</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {myEventsOnly ? 'My Schedule' : 'Upcoming Schedule'}
        </h2>
        <Link
          href="/admin/calendar"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const eventType = EVENT_TYPE_LABELS[event.type] || EVENT_TYPE_LABELS.other
          const eventDate = new Date(event.start_time)
          const timeAway = formatDistanceToNow(eventDate, { addSuffix: true })

          return (
            <Link
              key={event.id}
              href={`/admin/calendar?event=${event.id}`}
              className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`${eventType.color} p-2 rounded-lg shrink-0`}>
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{event.title}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 shrink-0">
                      {eventType.label}
                    </span>
                  </div>
                  {event.lead_name && (
                    <p className="text-sm text-gray-700">{event.lead_name}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAway}
                    </span>
                    {event.lead_address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.lead_address}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
