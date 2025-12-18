import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentCompany } from './use-current-company'
import {
  getEvents,
  getEventById,
  getEventsByLead,
  getEventsByUser,
  createEvent,
  createEventFromMaterialOrder,
  createEventFromLaborOrder,
  updateEvent,
  rescheduleEvent,
  cancelEvent,
  completeEvent,
  confirmEvent,
  deleteEvent,
  checkEventConflicts,
} from '@/lib/api/calendar'
import {
  CalendarEventInsert,
  CalendarEventUpdate,
  EventFilters,
} from '@/lib/types/calendar'

// =============================================
// QUERY HOOKS - READ
// =============================================

/**
 * Get all calendar events with optional filters
 */
export function useEvents(filters?: EventFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['calendar-events', company?.id, filters],
    queryFn: () => getEvents(company!.id, filters),
    enabled: !!company?.id,
  })
}

/**
 * Get a single calendar event by ID
 */
export function useEvent(eventId: string | null) {
  return useQuery({
    queryKey: ['calendar-event', eventId],
    queryFn: () => getEventById(eventId!),
    enabled: !!eventId,
  })
}

/**
 * Get all events for a specific lead
 */
export function useEventsByLead(leadId: string | null) {
  return useQuery({
    queryKey: ['calendar-events-lead', leadId],
    queryFn: () => getEventsByLead(leadId!),
    enabled: !!leadId,
  })
}

/**
 * Get events for current user (my schedule)
 */
export function useMySchedule(
  userId: string | null,
  startDate?: string,
  endDate?: string
) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['calendar-my-schedule', company?.id, userId, startDate, endDate],
    queryFn: () => getEventsByUser(company!.id, userId!, startDate, endDate),
    enabled: !!company?.id && !!userId,
  })
}

/**
 * Check for event conflicts
 */
export function useCheckConflicts(
  userId: string | null,
  eventDate: string | null,
  startTime: string | null,
  endTime: string | null,
  excludeEventId?: string
) {
  return useQuery({
    queryKey: [
      'calendar-conflicts',
      userId,
      eventDate,
      startTime,
      endTime,
      excludeEventId,
    ],
    queryFn: () =>
      checkEventConflicts(userId!, eventDate!, startTime!, endTime!, excludeEventId),
    enabled:
      !!userId && !!eventDate && !!startTime && !!endTime && startTime < endTime,
  })
}

// =============================================
// MUTATION HOOKS - CREATE
// =============================================

/**
 * Create a new calendar event
 */
export function useCreateEvent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (event: CalendarEventInsert) => createEvent(company!.id, event),
    onSuccess: (result, variables) => {
      if (result.error) {
        toast.error(`Failed to create event: ${result.error.message}`)
        return
      }

      // Invalidate ALL calendar queries for instant UI updates
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-my-schedule', company?.id] })

      // Invalidate lead-specific queries if event is linked to a lead
      if (variables.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['calendar-events-lead', variables.lead_id] })
      }

      // Invalidate material/labor order queries if linked
      if (variables.material_order_id) {
        queryClient.invalidateQueries({ queryKey: ['material-orders'] })
      }
      if (variables.labor_order_id) {
        queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      }

      toast.success('Event created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create event: ${error.message}`)
    },
  })
}

/**
 * Create event from material order (auto-creation)
 */
export function useCreateEventFromMaterialOrder() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      materialOrderId: string
      deliveryDate: string
      leadId: string
      leadName: string
      orderNumber: string
      createdBy: string
      assignedUsers?: string[]
    }) =>
      createEventFromMaterialOrder(
        company!.id,
        params.materialOrderId,
        params.deliveryDate,
        params.leadId,
        params.leadName,
        params.orderNumber,
        params.createdBy,
        params.assignedUsers
      ),
    onSuccess: (result, variables) => {
      if (result.error) {
        toast.error(`Failed to create material delivery event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events-lead', variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['material-orders'] })

      toast.success('Material delivery scheduled')
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule material delivery: ${error.message}`)
    },
  })
}

/**
 * Create event from labor order (auto-creation)
 */
export function useCreateEventFromLaborOrder() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      laborOrderId: string
      startDate: string
      leadId: string
      leadName: string
      orderNumber: string
      crewName: string
      createdBy: string
      assignedUsers?: string[]
    }) =>
      createEventFromLaborOrder(
        company!.id,
        params.laborOrderId,
        params.startDate,
        params.leadId,
        params.leadName,
        params.orderNumber,
        params.crewName,
        params.createdBy,
        params.assignedUsers
      ),
    onSuccess: (result, variables) => {
      if (result.error) {
        toast.error(`Failed to create installation event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events-lead', variables.leadId] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })

      toast.success('Installation scheduled')
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule installation: ${error.message}`)
    },
  })
}

// =============================================
// MUTATION HOOKS - UPDATE
// =============================================

/**
 * Update a calendar event
 */
export function useUpdateEvent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, updates }: { eventId: string; updates: CalendarEventUpdate }) =>
      updateEvent(eventId, updates),
    onSuccess: (result, variables) => {
      if (result.error) {
        toast.error(`Failed to update event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries for instant UI updates
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-my-schedule', company?.id] })

      // If date changed and event is linked to orders, invalidate order queries
      if (variables.updates.event_date) {
        queryClient.invalidateQueries({ queryKey: ['material-orders'] })
        queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      }

      toast.success('Event updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update event: ${error.message}`)
    },
  })
}

/**
 * Reschedule an event
 */
export function useRescheduleEvent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      newDate,
      newStartTime,
      newEndTime,
    }: {
      eventId: string
      newDate: string
      newStartTime?: string | null
      newEndTime?: string | null
    }) => rescheduleEvent(eventId, newDate, newStartTime, newEndTime),
    onSuccess: (result, variables) => {
      if (result.error) {
        toast.error(`Failed to reschedule event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-my-schedule', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['material-orders'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })

      toast.success('Event rescheduled successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to reschedule event: ${error.message}`)
    },
  })
}

/**
 * Cancel an event
 */
export function useCancelEvent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => cancelEvent(eventId),
    onSuccess: (result, eventId) => {
      if (result.error) {
        toast.error(`Failed to cancel event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-my-schedule', company?.id] })

      toast.success('Event cancelled')
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel event: ${error.message}`)
    },
  })
}

/**
 * Complete an event
 */
export function useCompleteEvent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => completeEvent(eventId),
    onSuccess: (result, eventId) => {
      if (result.error) {
        toast.error(`Failed to complete event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-my-schedule', company?.id] })

      toast.success('Event completed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete event: ${error.message}`)
    },
  })
}

/**
 * Confirm an event
 */
export function useConfirmEvent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => confirmEvent(eventId),
    onSuccess: (result, eventId) => {
      if (result.error) {
        toast.error(`Failed to confirm event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-my-schedule', company?.id] })

      toast.success('Event confirmed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm event: ${error.message}`)
    },
  })
}

// =============================================
// MUTATION HOOKS - DELETE
// =============================================

/**
 * Delete a calendar event (soft delete)
 */
export function useDeleteEvent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: (result, eventId) => {
      if (result.error) {
        toast.error(`Failed to delete event: ${result.error.message}`)
        return
      }

      // Invalidate all calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-my-schedule', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events-lead'] })

      toast.success('Event deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete event: ${error.message}`)
    },
  })
}
