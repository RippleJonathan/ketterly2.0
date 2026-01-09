'use client'

import { format, parseISO, isSameDay, startOfDay, isAfter, isBefore } from 'date-fns'
import { Calendar as CalendarIcon, MapPin, User, Clock } from 'lucide-react'
import { CalendarEventWithRelations, EVENT_TYPE_BG_COLORS, EVENT_TYPE_BORDER_COLORS, EVENT_TYPE_TEXT_COLORS, EVENT_TYPE_LABELS, EventStatus } from '@/lib/types/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ListViewProps {
  events: CalendarEventWithRelations[]
  onEventClick: (event: CalendarEventWithRelations) => void
}

export function ListView({ events, onEventClick }: ListViewProps) {
  if (events.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No events scheduled</p>
        <p className="text-sm">
          Events will appear here once scheduled
        </p>
      </div>
    )
  }

  // Filter to show only today and future events
  // Note: Events are already filtered at API level for List view
  const todayString = format(new Date(), 'yyyy-MM-dd')

  const upcomingEvents = events.filter(e => {
    // Compare date strings directly - reliable across timezones
    return e.event_date >= todayString
  })
  // Past events are filtered out to reduce clutter

  // Group events by date
  const groupEventsByDate = (events: CalendarEventWithRelations[]) => {
    return events.reduce((groups, event) => {
      const dateKey = event.event_date
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
      return groups
    }, {} as Record<string, CalendarEventWithRelations[]>)
  }

  const upcomingGrouped = groupEventsByDate(upcomingEvents)

  const renderEventGroup = (dateKey: string, dateEvents: CalendarEventWithRelations[], isPast = false) => {
    const eventDate = parseISO(dateKey)
    const isToday = isSameDay(eventDate, new Date())

    return (
      <div key={dateKey} className={cn("space-y-3", isPast && "opacity-60")}>
        {/* Date Header */}
        <div className={cn(
          "sticky top-0 z-10 bg-white border-b pb-2",
          isToday && "border-blue-500"
        )}>
          <h3 className={cn(
            "text-lg font-semibold",
            isToday && "text-blue-600",
            isPast && "text-gray-500"
          )}>
            {format(eventDate, 'EEEE, MMMM d, yyyy')}
            {isToday && (
              <Badge variant="default" className="ml-2">Today</Badge>
            )}
          </h3>
        </div>

        {/* Events for this date */}
        <div className="space-y-2">
          {dateEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => onEventClick(event)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Events */}
      {Object.keys(upcomingGrouped).length > 0 ? (
        Object.keys(upcomingGrouped).map(dateKey => 
          renderEventGroup(dateKey, upcomingGrouped[dateKey], false)
        )
      ) : (
        <div className="text-center text-gray-500 py-12">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No upcoming events</p>
          <p className="text-sm">
            Schedule your first appointment to get started
          </p>
        </div>
      )}
    </div>
  )
}

interface EventCardProps {
  event: CalendarEventWithRelations
  onClick: () => void
}

function EventCard({ event, onClick }: EventCardProps) {
  const bgColor = EVENT_TYPE_BG_COLORS[event.event_type]
  const borderColor = EVENT_TYPE_BORDER_COLORS[event.event_type]
  const textColor = EVENT_TYPE_TEXT_COLORS[event.event_type]
  const typeLabel = EVENT_TYPE_LABELS[event.event_type]

  const isCancelled = event.status === EventStatus.CANCELLED
  const isCompleted = event.status === EventStatus.COMPLETED

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow border-l-4",
        borderColor,
        isCancelled && "opacity-50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Event Info */}
          <div className="flex-1 min-w-0">
            {/* Title & Type Badge */}
            <div className="flex items-start gap-2 mb-2">
              <h4 className={cn(
                "font-semibold text-base flex-1 truncate",
                isCancelled && "line-through"
              )}>
                {event.title}
              </h4>
              <Badge 
                variant="secondary" 
                className={cn(bgColor, textColor, "text-xs shrink-0")}
              >
                {typeLabel}
              </Badge>
            </div>

            {/* Description */}
            {event.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {event.description}
              </p>
            )}

            {/* Time */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {event.is_all_day ? (
                  <span>All Day</span>
                ) : (
                  <span>
                    {event.start_time} - {event.end_time}
                  </span>
                )}
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-1 truncate">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            {/* Lead Info */}
            {event.lead && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                <User className="h-4 w-4" />
                <span>{event.lead.full_name}</span>
                {event.lead.address && (
                  <span className="text-gray-400">
                    • {event.lead.city || event.lead.address}
                  </span>
                )}
              </div>
            )}

            {/* Assigned Users */}
            {event.assigned_users && event.assigned_users.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <span className="font-medium">Assigned:</span>
                <span>{event.assigned_users.length} {event.assigned_users.length === 1 ? 'person' : 'people'}</span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          {(isCancelled || isCompleted || event.status === EventStatus.CONFIRMED) && (
            <div className="shrink-0">
              {isCancelled && (
                <Badge variant="destructive" className="text-xs">Cancelled</Badge>
              )}
              {isCompleted && (
                <Badge variant="default" className="bg-green-600 text-xs">Completed</Badge>
              )}
              {event.status === EventStatus.CONFIRMED && !isCompleted && (
                <Badge variant="default" className="bg-blue-600 text-xs">Confirmed</Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
