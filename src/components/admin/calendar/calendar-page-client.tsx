'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Calendar as CalendarIcon, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendarView, CalendarEventWithRelations, EventFilters } from '@/lib/types/calendar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEvents } from '@/lib/hooks/use-calendar'
import { ListView } from './list-view'
import { DayView } from './day-view'
import { WeekView } from './week-view'
import { MonthView } from './month-view'
import { EventQuickAddModal } from './event-quick-add-modal'
import { EventDetailModal } from './event-detail-modal'
import { CalendarFilters } from './calendar-filters'

interface CalendarPageClientProps {
  userId: string
  canCreateConsultations: boolean
  canCreateProductionEvents: boolean
  canEditAllEvents: boolean
  canManageRecurring: boolean
}

export function CalendarPageClient({
  userId,
  canCreateConsultations,
  canCreateProductionEvents,
  canEditAllEvents,
  canManageRecurring,
}: CalendarPageClientProps) {
  const [currentView, setCurrentView] = useState<CalendarView>(CalendarView.LIST)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showFilters, setShowFilters] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithRelations | null>(null)
  const [filters, setFilters] = useState<EventFilters>({
    exclude_cancelled: false,
  })

  // Fetch events for current month
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')

  const { data: eventsResponse, isLoading } = useEvents({
    ...filters,
    start_date: monthStart,
    end_date: monthEnd,
  })

  const events = eventsResponse?.data || []

  // Format header date based on view
  const getHeaderDate = () => {
    switch (currentView) {
      case CalendarView.DAY:
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case CalendarView.WEEK:
        return format(currentDate, 'MMMM yyyy')
      case CalendarView.MONTH:
        return format(currentDate, 'MMMM yyyy')
      case CalendarView.LIST:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  // Navigate dates
  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    switch (currentView) {
      case CalendarView.DAY:
        newDate.setDate(newDate.getDate() - 1)
        break
      case CalendarView.WEEK:
        newDate.setDate(newDate.getDate() - 7)
        break
      case CalendarView.MONTH:
      case CalendarView.LIST:
        newDate.setMonth(newDate.getMonth() - 1)
        break
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    switch (currentView) {
      case CalendarView.DAY:
        newDate.setDate(newDate.getDate() + 1)
        break
      case CalendarView.WEEK:
        newDate.setDate(newDate.getDate() + 7)
        break
      case CalendarView.MONTH:
      case CalendarView.LIST:
        newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const canCreateEvents = canCreateConsultations || canCreateProductionEvents

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Calendar</h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canCreateEvents && (
            <Button
              onClick={() => setShowQuickAdd(true)}
              className="flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-initial"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Navigation & View Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b bg-gray-50">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 font-semibold text-sm sm:text-base">
            {getHeaderDate()}
          </span>
        </div>

        {/* View Selector */}
        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as CalendarView)}>
          <TabsList>
            <TabsTrigger value={CalendarView.DAY}>Day</TabsTrigger>
            <TabsTrigger value={CalendarView.WEEK}>Week</TabsTrigger>
            <TabsTrigger value={CalendarView.MONTH}>Month</TabsTrigger>
            <TabsTrigger value={CalendarView.LIST}>List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters Panel (collapsible) */}
      {showFilters && (
        <div className="p-4 border-b bg-gray-50">
          <CalendarFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={() => setFilters({ exclude_cancelled: false })}
          />
        </div>
      )}

      {/* Calendar Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-500 py-12">
            <p>Loading events...</p>
          </div>
        ) : (
          <>
            {currentView === CalendarView.LIST && (
              <ListView 
                events={events} 
                onEventClick={(event) => setSelectedEvent(event)}
              />
            )}

            {currentView === CalendarView.DAY && (
              <DayView
                date={currentDate}
                events={events}
                onEventClick={(event) => setSelectedEvent(event)}
                onTimeSlotClick={(date, time) => {
                  setShowQuickAdd(true)
                  // TODO: Pre-fill time in quick add modal
                }}
              />
            )}

            {currentView === CalendarView.WEEK && (
              <WeekView
                date={currentDate}
                events={events}
                onEventClick={(event) => setSelectedEvent(event)}
                onTimeSlotClick={(date, time) => {
                  setShowQuickAdd(true)
                  // TODO: Pre-fill date and time in quick add modal
                }}
              />
            )}

            {currentView === CalendarView.MONTH && (
              <MonthView
                date={currentDate}
                events={events}
                onEventClick={(event) => setSelectedEvent(event)}
                onDayClick={(date) => {
                  setCurrentDate(date)
                  setCurrentView(CalendarView.DAY)
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <EventQuickAddModal
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        userId={userId}
        canCreateConsultations={canCreateConsultations}
        canCreateProductionEvents={canCreateProductionEvents}
        defaultDate={format(currentDate, 'yyyy-MM-dd')}
      />

      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        canEdit={canEditAllEvents}
      />
    </div>
  )
}
