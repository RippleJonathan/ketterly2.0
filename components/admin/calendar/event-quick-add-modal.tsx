'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useCreateEvent, useUpdateEvent } from '@/lib/hooks/use-calendar'
import { useUsers } from '@/lib/hooks/use-users'
import {
  EventType,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_DEFAULT_DURATION,
  EVENT_TYPE_DEFAULT_ALL_DAY,
  CalendarEventInsert,
  CalendarEventWithRelations,
} from '@/lib/types/calendar'
import { cn } from '@/lib/utils'

const eventFormSchema = z.object({
  event_type: z.nativeEnum(EventType),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_all_day: z.boolean().default(false),
  location: z.string().optional(),
  lead_id: z.string().optional(),
  assigned_users: z.array(z.string()).default([]),
  send_email_to_customer: z.boolean().default(false),
  meeting_url: z.string().optional(),
})

type EventFormData = z.infer<typeof eventFormSchema>

interface EventQuickAddModalProps {
  open: boolean
  onClose: () => void
  userId: string
  canCreateConsultations: boolean
  canCreateProductionEvents: boolean
  defaultDate?: string
  defaultLeadId?: string
  leadName?: string
  leadAddress?: string
  leadLocationId?: string
  existingEvent?: CalendarEventWithRelations
}

export function EventQuickAddModal({
  open,
  onClose,
  userId,
  canCreateConsultations,
  canCreateProductionEvents,
  defaultDate,
  defaultLeadId,
  leadName,
  leadAddress,
  leadLocationId,
  existingEvent,
}: EventQuickAddModalProps) {
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const { data: usersData } = useUsers() // Fetch all users for assignment
  const allUsers = usersData?.data || []
  
  // Filter users by location if leadLocationId is provided
  // Include admins/super_admins regardless of location
  // Check location_assignments array for location match
  const users = leadLocationId 
    ? allUsers.filter(user => {
        const hasLocationAccess = user.location_assignments?.some(
          (assignment: any) => assignment.location_id === leadLocationId
        )
        const isAdmin = user.role === 'admin' || user.role === 'super_admin'
        return hasLocationAccess || isAdmin
      })
    : allUsers
  
  const isEditing = !!existingEvent

  // Determine available event types based on permissions
  const availableTypes: EventType[] = []
  if (canCreateConsultations) {
    availableTypes.push(EventType.CONSULTATION, EventType.ADJUSTER_MEETING, EventType.OTHER)
  }
  if (canCreateProductionEvents) {
    availableTypes.push(EventType.PRODUCTION_MATERIALS, EventType.PRODUCTION_LABOR)
  }

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: existingEvent ? {
      event_type: existingEvent.event_type,
      title: existingEvent.title,
      description: existingEvent.description || '',
      event_date: existingEvent.event_date,
      start_time: existingEvent.start_time || '09:00',
      end_time: existingEvent.end_time || '10:00',
      is_all_day: existingEvent.is_all_day,
      location: existingEvent.location || '',
      lead_id: existingEvent.lead_id || '',
      assigned_users: existingEvent.assigned_users || [userId],
      send_email_to_customer: existingEvent.send_email_to_customer ?? true, // Default to true
      meeting_url: existingEvent.meeting_url || '',
    } : {
      event_type: availableTypes[0] || EventType.CONSULTATION,
      title: '',
      description: '',
      event_date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
      is_all_day: false,
      location: leadAddress || '', // Prefill with customer address
      lead_id: defaultLeadId || '',
      assigned_users: [userId], // Default to current user
      send_email_to_customer: true, // Default to true
      meeting_url: '',
    },
  })

  const selectedType = form.watch('event_type')
  const isAllDay = form.watch('is_all_day')
  const assignedUsers = form.watch('assigned_users')
  const startTime = form.watch('start_time')

  // Auto-update title when event type changes
  useEffect(() => {
    if (selectedType && leadName && !isEditing) {
      const typeLabel = selectedType.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      form.setValue('title', `${typeLabel} - ${leadName}`)
    }
  }, [selectedType, leadName, isEditing, form])

  // Auto-update end time when start time changes (+1 hour)
  const handleStartTimeChange = (newStartTime: string) => {
    form.setValue('start_time', newStartTime)
    if (newStartTime && !isAllDay) {
      const [hours, minutes] = newStartTime.split(':').map(Number)
      const endHour = (hours + 1) % 24
      const endMinutes = minutes.toString().padStart(2, '0')
      form.setValue('end_time', `${endHour.toString().padStart(2, '0')}:${endMinutes}`)
    }
  }

  // Update default duration when event type changes
  const handleTypeChange = (type: EventType) => {
    form.setValue('event_type', type)
    const defaultAllDay = EVENT_TYPE_DEFAULT_ALL_DAY[type]
    const defaultDuration = EVENT_TYPE_DEFAULT_DURATION[type]
    
    form.setValue('is_all_day', defaultAllDay)
    
    if (!defaultAllDay && defaultDuration) {
      const startTime = '09:00'
      const [hours, minutes] = startTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + defaultDuration
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMinutes = totalMinutes % 60
      form.setValue('start_time', startTime)
      form.setValue('end_time', `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`)
    }
  }

  const onSubmit = async (data: EventFormData) => {
    if (isEditing && existingEvent) {
      // Update existing event
      await updateEvent.mutateAsync({
        eventId: existingEvent.id,
        updates: data,
      })
    } else {
      // Create new event - use assigned_users from form
      const event: Omit<CalendarEventInsert, 'company_id'> = {
        ...data,
        created_by: userId,
      }
      await createEvent.mutateAsync(event as CalendarEventInsert)
    }
    form.reset()
    onClose()
  }

  if (availableTypes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Permission</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            You don't have permission to create calendar events.
          </p>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {isEditing ? 'Edit Event' : 'Schedule New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="event_type">Event Type *</Label>
            <Select
              value={selectedType}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {EVENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="e.g., Consultation with John Smith"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Add notes about this event..."
              rows={3}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="event_date">Date *</Label>
            <Input
              id="event_date"
              type="date"
              className="max-w-[200px]"
              {...form.register('event_date')}
            />
            {form.formState.errors.event_date && (
              <p className="text-sm text-red-600">
                {form.formState.errors.event_date.message}
              </p>
            )}
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label htmlFor="all_day" className="cursor-pointer">
              All Day Event
            </Label>
            <Switch
              id="all_day"
              checked={isAllDay}
              onCheckedChange={(checked) => form.setValue('is_all_day', checked)}
            />
          </div>

          {/* Start/End Time (if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  className="max-w-[150px]"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  className="max-w-[150px]"
                  {...form.register('end_time')}
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...form.register('location')}
              placeholder="e.g., Customer site, Office, etc."
            />
          </div>

          {/* Meeting URL */}
          <div className="space-y-2">
            <Label htmlFor="meeting_url">Meeting URL (Optional)</Label>
            <Input
              id="meeting_url"
              {...form.register('meeting_url')}
              placeholder="e.g., Zoom or Google Meet link"
            />
          </div>

          {/* Send Email to Customer */}
          {defaultLeadId && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex-1">
                <Label htmlFor="send_email" className="font-medium text-blue-900 cursor-pointer">
                  Email appointment details to customer
                </Label>
                <p className="text-xs text-blue-700 mt-1">
                  Sends appointment date, time, and location to customer via email
                </p>
              </div>
              <Switch
                id="send_email"
                checked={form.watch('send_email_to_customer')}
                onCheckedChange={(checked) => form.setValue('send_email_to_customer', checked)}
              />
            </div>
          )}

          {/* Assign Users */}
          <div className="space-y-2">
            <Label>Assign to Users</Label>
            <p className="text-xs text-gray-500 mb-2">
              Select team members who should be notified about this appointment
            </p>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {users.map((user) => {
                const isAssigned = assignedUsers.includes(user.id)
                return (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={(e) => {
                        const currentUsers = form.getValues('assigned_users')
                        if (e.target.checked) {
                          form.setValue('assigned_users', [...currentUsers, user.id])
                        } else {
                          form.setValue('assigned_users', currentUsers.filter(id => id !== user.id))
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.role}</div>
                    </div>
                  </label>
                )
              })}
            </div>
            {assignedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {assignedUsers.map((userId) => {
                  const user = users.find(u => u.id === userId)
                  if (!user) return null
                  return (
                    <Badge key={userId} variant="secondary" className="gap-1">
                      {user.full_name}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-600"
                        onClick={() => {
                          form.setValue('assigned_users', assignedUsers.filter(id => id !== userId))
                        }}
                      />
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createEvent.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
