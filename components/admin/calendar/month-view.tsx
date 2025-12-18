'use client'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns'
import { CalendarEventWithRelations, EVENT_TYPE_BG_COLORS, EVENT_TYPE_BORDER_COLORS, EVENT_TYPE_LABELS } from '@/lib/types/calendar'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface MonthViewProps {
  date: Date
  events: CalendarEventWithRelations[]
  onEventClick: (event: CalendarEventWithRelations) => void
  onDayClick?: (date: Date) => void
}

export function MonthView({ date, events, onEventClick, onDayClick }: MonthViewProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  // Get calendar grid (includes days from previous/next month)
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.event_date)
      return isSameDay(eventDate, day)
    })
  }

  // Toggle expanded day
  const handleDayClick = (day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd')
    setExpandedDay(expandedDay === dayKey ? null : dayKey)
    onDayClick?.(day)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border overflow-hidden">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="p-2 text-center text-xs font-semibold text-gray-600 border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 auto-rows-fr min-h-full">
          {calendarDays.map(day => {
            const dayEvents = getEventsForDay(day)
            const dayKey = format(day, 'yyyy-MM-dd')
            const isExpanded = expandedDay === dayKey
            const isCurrentMonth = isSameMonth(day, date)
            const isTodayDate = isToday(day)

            return (
              <div
                key={dayKey}
                className={cn(
                  'border-r border-b last:border-r-0 min-h-[120px] p-1 flex flex-col',
                  !isCurrentMonth && 'bg-gray-50',
                  isTodayDate && 'bg-blue-50/30'
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium hover:bg-gray-200 transition-colors',
                      isTodayDate && 'bg-blue-600 text-white hover:bg-blue-700',
                      !isCurrentMonth && !isTodayDate && 'text-gray-400'
                    )}
                  >
                    {format(day, 'd')}
                  </button>

                  {dayEvents.length > 0 && (
                    <button
                      onClick={() => handleDayClick(day)}
                      className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-0.5"
                    >
                      {dayEvents.length}
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* Event Display */}
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {isExpanded ? (
                    // Expanded: Show all events with details
                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                      {dayEvents.map(event => (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                          className={cn(
                            'w-full text-left px-1.5 py-1 rounded text-xs border-l-2 hover:shadow-sm transition-shadow',
                            EVENT_TYPE_BG_COLORS[event.event_type],
                            EVENT_TYPE_BORDER_COLORS[event.event_type]
                          )}
                        >
                          <div className="font-medium truncate leading-tight">
                            {event.title}
                          </div>
                          {event.start_time && !event.is_all_day && (
                            <div className="text-[10px] opacity-75 mt-0.5">
                              {event.start_time.slice(0, 5)}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Collapsed: Show first 2-3 events as dots/bars
                    <>
                      {dayEvents.slice(0, 3).map(event => (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                          className={cn(
                            'w-full text-left px-1 py-0.5 rounded text-[10px] truncate border-l-2',
                            'hover:shadow-sm transition-shadow leading-tight',
                            EVENT_TYPE_BG_COLORS[event.event_type],
                            EVENT_TYPE_BORDER_COLORS[event.event_type]
                          )}
                          title={event.title}
                        >
                          {event.start_time && !event.is_all_day && (
                            <span className="opacity-75">{event.start_time.slice(0, 5)} </span>
                          )}
                          <span className="font-medium">{event.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          onClick={() => handleDayClick(day)}
                          className="w-full text-left px-1 text-[10px] text-gray-600 hover:text-gray-900"
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
