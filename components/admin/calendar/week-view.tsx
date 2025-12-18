'use client'

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns'
import { Clock, MapPin } from 'lucide-react'
import { CalendarEventWithRelations, EVENT_TYPE_BG_COLORS, EVENT_TYPE_BORDER_COLORS, EVENT_TYPE_LABELS } from '@/lib/types/calendar'
import { cn } from '@/lib/utils'

interface WeekViewProps {
  date: Date
  events: CalendarEventWithRelations[]
  onEventClick: (event: CalendarEventWithRelations) => void
  onTimeSlotClick?: (date: Date, time: string) => void
}

// Time slots from 7am to 7pm (12 hours)
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 7
  return `${hour.toString().padStart(2, '0')}:00`
})

export function WeekView({ date, events, onEventClick, onTimeSlotClick }: WeekViewProps) {
  // Get week range (Monday to Sunday)
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Separate all-day events from timed events
  const allDayEvents = events.filter(e => e.is_all_day)
  const timedEvents = events.filter(e => !e.is_all_day)

  // Get events for a specific day
  const getEventsForDay = (day: Date, isAllDay: boolean) => {
    const dayEvents = isAllDay ? allDayEvents : timedEvents
    return dayEvents.filter(event => {
      const eventDate = parseISO(event.event_date)
      return isSameDay(eventDate, day)
    })
  }

  // Calculate event position within a time slot
  const getEventPosition = (event: CalendarEventWithRelations) => {
    if (!event.start_time) return { top: 0, height: 60 }

    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = (event.end_time || event.start_time).split(':').map(Number)

    const startMinutes = (startHour - 7) * 60 + startMinute
    const endMinutes = (endHour - 7) * 60 + endMinute
    const duration = endMinutes - startMinutes

    // Each hour is 80px tall
    const pixelsPerMinute = 80 / 60
    const top = startMinutes * pixelsPerMinute
    const height = Math.max(duration * pixelsPerMinute, 30) // Minimum 30px

    return { top, height }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border overflow-hidden">
      {/* Week Header with Day Names */}
      <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-10">
        {/* Time column header */}
        <div className="p-2 border-r">
          <div className="text-xs text-gray-500 font-medium">Time</div>
        </div>

        {/* Day headers */}
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              'p-2 text-center border-r last:border-r-0',
              isToday(day) && 'bg-blue-50'
            )}
          >
            <div className="text-xs text-gray-500 font-medium">
              {format(day, 'EEE')}
            </div>
            <div
              className={cn(
                'text-lg font-semibold mt-1',
                isToday(day) ? 'text-blue-600' : 'text-gray-900'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {/* All-Day Events Row */}
        {allDayEvents.length > 0 && (
          <div className="grid grid-cols-8 border-b bg-gray-50 min-h-[60px]">
            <div className="p-2 border-r flex items-center">
              <span className="text-xs text-gray-500 font-medium">All Day</span>
            </div>

            {weekDays.map(day => {
              const dayAllDayEvents = getEventsForDay(day, true)
              return (
                <div
                  key={day.toISOString()}
                  className="p-1 border-r last:border-r-0 flex flex-col gap-1"
                >
                  {dayAllDayEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        'px-2 py-1 text-left text-xs rounded border-l-2 truncate hover:shadow-sm transition-shadow',
                        EVENT_TYPE_BG_COLORS[event.event_type],
                        EVENT_TYPE_BORDER_COLORS[event.event_type]
                      )}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Time Grid */}
        <div className="grid grid-cols-8">
          {/* Time slots column */}
          <div className="border-r">
            {TIME_SLOTS.map(time => (
              <div
                key={time}
                className="h-20 border-b p-1 text-xs text-gray-500 text-right pr-2"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {weekDays.map(day => {
            const dayTimedEvents = getEventsForDay(day, false)

            return (
              <div
                key={day.toISOString()}
                className="border-r last:border-r-0 relative"
              >
                {/* Time slot grid */}
                {TIME_SLOTS.map((time, index) => (
                  <div
                    key={time}
                    onClick={() => onTimeSlotClick?.(day, time)}
                    className={cn(
                      'h-20 border-b cursor-pointer hover:bg-blue-50/50 transition-colors',
                      isToday(day) && index === 0 && 'bg-blue-50/30'
                    )}
                  />
                ))}

                {/* Events positioned absolutely */}
                <div className="absolute inset-0 pointer-events-none">
                  {dayTimedEvents.map(event => {
                    const { top, height } = getEventPosition(event)
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={cn(
                          'absolute left-0.5 right-0.5 px-1.5 py-1 text-left text-xs rounded border-l-2 pointer-events-auto',
                          'hover:shadow-md hover:z-10 transition-shadow overflow-hidden',
                          EVENT_TYPE_BG_COLORS[event.event_type],
                          EVENT_TYPE_BORDER_COLORS[event.event_type]
                        )}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                      >
                        <div className="font-medium truncate text-xs leading-tight">
                          {event.title}
                        </div>
                        {event.start_time && (
                          <div className="flex items-center gap-1 text-[10px] opacity-75 mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {event.start_time.slice(0, 5)}
                          </div>
                        )}
                        {event.location && height > 45 && (
                          <div className="flex items-center gap-1 text-[10px] opacity-75 truncate">
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
