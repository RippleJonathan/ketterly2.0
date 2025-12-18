'use client'

import { format, isSameDay, parseISO } from 'date-fns'
import { Clock, MapPin } from 'lucide-react'
import { CalendarEventWithRelations, EVENT_TYPE_BG_COLORS, EVENT_TYPE_BORDER_COLORS } from '@/lib/types/calendar'
import { useEffect, useRef } from 'react'

interface DayViewProps {
  date: Date
  events: CalendarEventWithRelations[]
  onEventClick: (event: CalendarEventWithRelations) => void
  onTimeSlotClick?: (date: Date, time: string) => void
}

// Time slots from 7am to 7pm (12 hours * 2 half-hour slots = 24 slots)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7
  const minute = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
})

export function DayView({ date, events, onEventClick, onTimeSlotClick }: DayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentTimeRef = useRef<HTMLDivElement>(null)

  // Filter events for the selected day
  const dayEvents = events.filter(event => {
    const eventDate = parseISO(event.event_date)
    return isSameDay(eventDate, date)
  })

  // Scroll to current time on mount
  useEffect(() => {
    if (currentTimeRef.current && containerRef.current) {
      const now = new Date()
      if (isSameDay(now, date)) {
        // Scroll to current time with some offset
        setTimeout(() => {
          currentTimeRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
        }, 100)
      }
    }
  }, [date])

  // Calculate event position and height
  const getEventStyle = (event: CalendarEventWithRelations) => {
    if (event.is_all_day || !event.start_time || !event.end_time) {
      return null // All-day events shown separately
    }

    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)

    // Calculate minutes from 7am
    const startMinutes = (startHour - 7) * 60 + startMinute
    const endMinutes = (endHour - 7) * 60 + endMinute

    // Each hour is 60px, each minute is 1px
    const top = startMinutes
    const height = endMinutes - startMinutes

    return {
      top: `${top}px`,
      height: `${height}px`,
    }
  }

  // Get current time position
  const getCurrentTimePosition = () => {
    const now = new Date()
    if (!isSameDay(now, date)) return null

    const hours = now.getHours()
    const minutes = now.getMinutes()

    // Calculate minutes from 7am
    const totalMinutes = (hours - 7) * 60 + minutes

    // Don't show if before 7am or after 7pm
    if (totalMinutes < 0 || totalMinutes > 720) return null

    return `${totalMinutes}px`
  }

  const currentTimePosition = getCurrentTimePosition()

  // All-day events
  const allDayEvents = dayEvents.filter(e => e.is_all_day || !e.start_time)
  const timedEvents = dayEvents.filter(e => !e.is_all_day && e.start_time)

  return (
    <div className="flex flex-col h-full">
      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-b bg-gray-50 p-2">
          <div className="text-xs font-semibold text-gray-500 mb-2">All Day</div>
          <div className="space-y-1">
            {allDayEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`
                  w-full text-left px-3 py-1.5 rounded text-sm
                  border-l-4
                  ${EVENT_TYPE_BG_COLORS[event.event_type]}
                  ${EVENT_TYPE_BORDER_COLORS[event.event_type]}
                  hover:shadow-sm transition-shadow
                `}
              >
                <div className="font-medium truncate">{event.title}</div>
                {event.location && (
                  <div className="text-xs opacity-75 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="relative" style={{ height: '720px' }}> {/* 12 hours * 60px */}
          {/* Time labels and grid lines */}
          {TIME_SLOTS.map((time, index) => {
            const isHourMark = index % 2 === 0
            
            return (
              <div
                key={time}
                className="absolute w-full flex"
                style={{ top: `${index * 30}px`, height: '30px' }}
              >
                {/* Time label */}
                <div className="w-16 pr-2 text-right flex-shrink-0">
                  {isHourMark && (
                    <span className="text-xs text-gray-500">
                      {format(new Date(`2000-01-01T${time}`), 'h a')}
                    </span>
                  )}
                </div>

                {/* Grid cell */}
                <button
                  onClick={() => onTimeSlotClick?.(date, time)}
                  className={`
                    flex-1 border-t border-gray-200
                    ${isHourMark ? 'border-t-2' : 'border-t border-dashed'}
                    hover:bg-blue-50/50 transition-colors cursor-pointer
                  `}
                  title={`Create event at ${time}`}
                />
              </div>
            )
          })}

          {/* Current time indicator */}
          {currentTimePosition && (
            <div
              ref={currentTimeRef}
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: currentTimePosition }}
            >
              <div className="flex items-center">
                <div className="w-16 flex-shrink-0 pr-2 text-right">
                  <div className="w-2 h-2 rounded-full bg-red-500 ml-auto" />
                </div>
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}

          {/* Timed events */}
          <div className="absolute left-16 right-0 top-0 bottom-0">
            {timedEvents.map((event, idx) => {
              const style = getEventStyle(event)
              if (!style) return null

              // Check for overlapping events to adjust width
              const overlaps = timedEvents.filter((other, otherIdx) => {
                if (otherIdx >= idx) return false
                const otherStyle = getEventStyle(other)
                if (!otherStyle) return false

                const thisTop = parseInt(style.top)
                const thisBottom = thisTop + parseInt(style.height)
                const otherTop = parseInt(otherStyle.top)
                const otherBottom = otherTop + parseInt(otherStyle.height)

                return !(thisBottom <= otherTop || thisTop >= otherBottom)
              }).length

              const widthPercent = overlaps > 0 ? 100 / (overlaps + 1) : 100
              const leftPercent = overlaps > 0 ? (overlaps * widthPercent) : 0

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`
                    absolute px-2 py-1 rounded text-xs border-l-4
                    ${EVENT_TYPE_BG_COLORS[event.event_type]}
                    ${EVENT_TYPE_BORDER_COLORS[event.event_type]}
                    hover:shadow-md hover:z-10 transition-all
                    overflow-hidden
                  `}
                  style={{
                    ...style,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    minHeight: '20px',
                  }}
                  title={event.title}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  {event.start_time && (
                    <div className="flex items-center gap-1 opacity-75 mt-0.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {format(new Date(`2000-01-01T${event.start_time}`), 'h:mm a')}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1 opacity-75 truncate mt-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate text-xs">{event.location}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
