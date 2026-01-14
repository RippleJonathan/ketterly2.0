'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, User, Plus, Video, FileText, Edit, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow, format, parseISO, parse } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { EventQuickAddModal } from '@/components/admin/calendar/event-quick-add-modal'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useCheckPermission } from '@/lib/hooks/use-permissions'

interface EventsTabProps {
  leadId: string
  leadName: string
  leadAddress?: string
  leadCity?: string
  leadState?: string
  leadZip?: string
  leadLocationId?: string
}

const EVENT_TYPE_COLORS = {
  consultation: 'bg-blue-100 text-blue-800',
  inspection: 'bg-purple-100 text-purple-800',
  installation: 'bg-green-100 text-green-800',
  follow_up: 'bg-yellow-100 text-yellow-800',
  meeting: 'bg-gray-100 text-gray-800',
}

const EVENT_TYPE_LABELS = {
  consultation: 'Consultation',
  inspection: 'Inspection',
  installation: 'Installation',
  follow_up: 'Follow Up',
  meeting: 'Meeting',
}

export function EventsTab({ leadId, leadName, leadAddress, leadCity, leadState, leadZip, leadLocationId }: EventsTabProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const { data: currentUserResponse } = useCurrentUser()
  const currentUser = currentUserResponse?.data
  const supabase = createClient()

  // Build full address string
  const fullAddress = [leadAddress, leadCity, leadState, leadZip]
    .filter(Boolean)
    .join(', ')

  // Check permissions for calendar events
  const { data: canCreateConsultations } = useCheckPermission(currentUser?.id || '', 'can_create_consultations')
  const { data: canCreateProductionEvents } = useCheckPermission(currentUser?.id || '', 'can_create_production_events')

  // Fetch events for this lead
  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events-lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('lead_id', leadId)
        .is('deleted_at', null)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      return data || []
    },
  })

  const queryClient = useQueryClient()

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('calendar_events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events-lead', leadId] })
    },
  })

  const handleDeleteEvent = async (event: any) => {
    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      try {
        await deleteEventMutation.mutateAsync(event.id)
      } catch (error) {
        alert('Failed to delete event')
      }
    }
  }

  // Separate upcoming and past events
  const now = new Date()
  const upcomingEvents = events?.filter(e => new Date(e.event_date) >= now) || []
  const pastEvents = events?.filter(e => new Date(e.event_date) < now) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Events & Appointments</h2>
        <p className="text-sm text-gray-500 mt-1">
          Schedule and manage appointments for {leadName}
        </p>
      </div>

      {/* Schedule Button */}
      <Button onClick={() => setShowScheduleModal(true)} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2" />
        Schedule Appointment
      </Button>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events ({upcomingEvents.length})
          </CardTitle>
          <CardDescription>
            Scheduled appointments and meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading events...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-1">No upcoming events</p>
              <p className="text-sm">Schedule an appointment to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event: any) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onEdit={(event) => {
                    setEditingEvent(event)
                    setShowScheduleModal(true)
                  }}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Past Events ({pastEvents.length})
            </CardTitle>
            <CardDescription>
              Completed appointments and meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastEvents.map((event: any) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  isPast 
                  onEdit={(event) => {
                    setEditingEvent(event)
                    setShowScheduleModal(true)
                  }}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Modal */}
      {currentUser && (
        <EventQuickAddModal
          open={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false)
            setEditingEvent(null)
          }}
          userId={currentUser.id}
          canCreateConsultations={canCreateConsultations || false}
          canCreateProductionEvents={canCreateProductionEvents || false}
          defaultLeadId={leadId}
          leadName={leadName}
          leadAddress={fullAddress}
          leadLocationId={leadLocationId}
          defaultDate={new Date().toISOString().split('T')[0]}
          existingEvent={editingEvent}
        />
      )}
    </div>
  )
}

function EventCard({ event, isPast = false, onEdit, onDelete }: { event: any; isPast?: boolean; onEdit?: (event: any) => void; onDelete?: (event: any) => void }) {
  const eventType = event.event_type as keyof typeof EVENT_TYPE_LABELS
  // Parse date as local date (not UTC) to avoid timezone offset issues
  const eventDate = parse(event.event_date, 'yyyy-MM-dd', new Date())
  // Set to end of day for accurate "days until" calculation
  const eventDateEndOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59)
  const isToday = format(eventDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className={`p-4 border rounded-lg ${isPast ? 'bg-gray-50 opacity-75' : 'bg-white hover:shadow-md'} transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={EVENT_TYPE_COLORS[eventType] || EVENT_TYPE_COLORS.meeting}>
              {EVENT_TYPE_LABELS[eventType] || 'Event'}
            </Badge>
            {isToday && !isPast && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                Today
              </Badge>
            )}
          </div>
          
          <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
          
          {event.description && (
            <p className="text-sm text-gray-600 mb-3">{event.description}</p>
          )}

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {format(eventDate, 'EEEE, MMMM d, yyyy')}
                {!isPast && (
                  <span className="text-gray-500 ml-2">
                    ({formatDistanceToNow(eventDateEndOfDay, { addSuffix: true })})
                  </span>
                )}
              </span>
            </div>
            
            {event.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {event.start_time}
                  {event.end_time && ` - ${event.end_time}`}
                </span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}

            {event.assigned_user && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{event.assigned_user.full_name}</span>
              </div>
            )}

            {event.meeting_url && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <a 
                  href={event.meeting_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Join Meeting
                </a>
              </div>
            )}

            {event.notes && (
              <div className="flex items-start gap-2 mt-2">
                <FileText className="h-4 w-4 mt-0.5" />
                <span className="text-gray-500 italic">{event.notes}</span>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          {!isPast && (
            <div className="flex gap-2 mt-4">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(event)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(event)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
