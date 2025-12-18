'use client'

import { useState } from 'react'
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
import { useCreateEvent, useUpdateEvent } from '@/lib/hooks/use-calendar'
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
  existingEvent,
}: EventQuickAddModalProps) {
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  
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
    } : {
      event_type: availableTypes[0] || EventType.CONSULTATION,
      title: '',
      description: '',
      event_date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
      is_all_day: false,
      location: '',
      lead_id: defaultLeadId || '',
    },
  })

  const selectedType = form.watch('event_type')
  const isAllDay = form.watch('is_all_day')

  // Update default duration when event type changes
  const handleTypeChange = (type: EventType) => {
    form.setValue('event_type', type)
    const defaultAllDay = EVENT_TYPE_DEFAULT_ALL_DAY[type]
    const defaultDuration = EVENT_TYPE_DEFAULT_DURATION[type]
    
    form.setValue('is_all_day', defaultAllDay)
    
    if (!defaultAllDay && defaultDuration) {
      const startTime = '09:00'
      const [hours] = startTime.split(':').map(Number)
      const endHour = hours + defaultDuration
      form.setValue('start_time', startTime)
      form.setValue('end_time', `${endHour.toString().padStart(2, '0')}:00`)
    }
  }

  const onSubmit = async (data: EventFormData) => {
    if (isEditing && existingEvent) {
      // Update existing event
      await updateEvent.mutateAsync({
        id: existingEvent.id,
        updates: data,
      })
    } else {
      // Create new event
      const event: Omit<CalendarEventInsert, 'company_id'> = {
        ...data,
        assigned_users: [userId],
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">Date *</Label>
              <Input
                id="event_date"
                type="date"
                {...form.register('event_date')}
              />
              {form.formState.errors.event_date && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.event_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>All Day Event</span>
                <Switch
                  checked={isAllDay}
                  onCheckedChange={(checked) => form.setValue('is_all_day', checked)}
                />
              </Label>
            </div>
          </div>

          {/* Start/End Time (if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...form.register('start_time')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
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
