import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  CalendarEvent,
  CalendarEventWithRelations,
  CalendarEventInsert,
  CalendarEventUpdate,
  EventFilters,
  EventType,
  EventStatus,
} from '@/lib/types/calendar'

const supabase = createClient()

// =============================================
// CALENDAR EVENTS - READ
// =============================================

/**
 * Get all calendar events for a company with optional filters
 */
export async function getEvents(
  companyId: string,
  filters?: EventFilters
): Promise<ApiResponse<CalendarEventWithRelations[]>> {
  try {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        lead:leads!calendar_events_lead_id_fkey(
          id, full_name, email, phone, address, city, state
        ),
        created_by_user:users!calendar_events_created_by_fkey(
          id, full_name
        ),
        material_order:material_orders!calendar_events_material_order_id_fkey(
          id, order_number, expected_delivery_date, actual_delivery_date
        ),
        labor_order:work_orders!calendar_events_labor_order_id_fkey(
          id, work_order_number, scheduled_date, actual_start_date, actual_completion_date
        )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Apply filters
    if (filters?.event_types && filters.event_types.length > 0) {
      query = query.in('event_type', filters.event_types)
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses)
    }

    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }

    if (filters?.start_date) {
      query = query.gte('event_date', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('event_date', filters.end_date)
    }

    if (filters?.is_all_day !== undefined) {
      query = query.eq('is_all_day', filters.is_all_day)
    }

    if (filters?.exclude_cancelled) {
      query = query.neq('status', 'cancelled')
    }

    // Search in title, description, location
    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) throw error

    // Filter by assigned users (PostgreSQL array search)
    let filteredData = data || []
    if (filters?.assigned_user_ids && filters.assigned_user_ids.length > 0) {
      filteredData = filteredData.filter(event =>
        filters.assigned_user_ids!.some(userId => event.assigned_users.includes(userId))
      )
    }

    return { data: filteredData, error: null, count: count ?? undefined }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get a single calendar event by ID
 */
export async function getEventById(
  eventId: string
): Promise<ApiResponse<CalendarEventWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        lead:leads!calendar_events_lead_id_fkey(
          id, full_name, email, phone, address, city, state
        ),
        created_by_user:users!calendar_events_created_by_fkey(
          id, full_name
        ),
        material_order:material_orders!calendar_events_material_order_id_fkey(
          id, order_number, expected_delivery_date, actual_delivery_date
        ),
        labor_order:work_orders!calendar_events_labor_order_id_fkey(
          id, work_order_number, scheduled_date, actual_start_date, actual_completion_date
        ),
        related_event:calendar_events!calendar_events_related_event_id_fkey(
          id, event_type, title, event_date
        )
      `)
      .eq('id', eventId)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    // Get assigned users data
    if (data && data.assigned_users.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('id', data.assigned_users)

      if (usersData) {
        data.assigned_users_data = usersData
      }
    }

    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get all events for a specific lead
 */
export async function getEventsByLead(
  leadId: string
): Promise<ApiResponse<CalendarEventWithRelations[]>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        created_by_user:users!calendar_events_created_by_fkey(id, full_name)
      `)
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get events for a specific user (their schedule)
 */
export async function getEventsByUser(
  companyId: string,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<CalendarEventWithRelations[]>> {
  try {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        lead:leads!calendar_events_lead_id_fkey(id, full_name, address, city)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true })

    if (startDate) {
      query = query.gte('event_date', startDate)
    }

    if (endDate) {
      query = query.lte('event_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    // Filter by assigned user
    const filteredData = (data || []).filter(event =>
      event.assigned_users.includes(userId)
    )

    return { data: filteredData, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// CALENDAR EVENTS - CREATE
// =============================================

/**
 * Create a new calendar event
 */
export async function createEvent(
  companyId: string,
  event: CalendarEventInsert
): Promise<ApiResponse<CalendarEvent>> {
  try {
    // Convert empty strings to null for optional UUID fields
    const eventData = {
      ...event,
      company_id: companyId,
      lead_id: event.lead_id || null,
      material_order_id: event.material_order_id || null,
      labor_order_id: event.labor_order_id || null,
      related_event_id: event.related_event_id || null,
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert(eventData)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create calendar event from material order
 */
export async function createEventFromMaterialOrder(
  companyId: string,
  materialOrderId: string,
  deliveryDate: string,
  leadId: string,
  leadName: string,
  orderNumber: string,
  createdBy: string,
  assignedUsers: string[] = []
): Promise<ApiResponse<CalendarEvent>> {
  try {
    const event: CalendarEventInsert = {
      company_id: companyId,
      lead_id: leadId,
      event_type: EventType.PRODUCTION_MATERIALS,
      title: `Material Delivery - ${leadName}`,
      description: `Order #${orderNumber}`,
      event_date: deliveryDate,
      is_all_day: true,
      assigned_users: assignedUsers,
      created_by: createdBy,
      material_order_id: materialOrderId,
      status: EventStatus.SCHEDULED,
    }

    return createEvent(companyId, event)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create calendar event from labor order
 */
export async function createEventFromLaborOrder(
  companyId: string,
  laborOrderId: string,
  startDate: string,
  leadId: string,
  leadName: string,
  orderNumber: string,
  crewName: string,
  createdBy: string,
  assignedUsers: string[] = []
): Promise<ApiResponse<CalendarEvent>> {
  try {
    // Check if there's a related material delivery event
    const { data: materialEvent } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('lead_id', leadId)
      .eq('event_type', EventType.PRODUCTION_MATERIALS)
      .is('deleted_at', null)
      .order('event_date', { ascending: false })
      .limit(1)
      .single()

    const event: CalendarEventInsert = {
      company_id: companyId,
      lead_id: leadId,
      event_type: EventType.PRODUCTION_LABOR,
      title: `Installation - ${leadName}`,
      description: `Work Order #${orderNumber} - ${crewName}`,
      event_date: startDate,
      is_all_day: true,
      assigned_users: assignedUsers,
      created_by: createdBy,
      labor_order_id: laborOrderId,
      related_event_id: materialEvent?.id || null,
      status: EventStatus.SCHEDULED,
    }

    const result = await createEvent(companyId, event)

    // If material event exists, link them both ways
    if (materialEvent && result.data) {
      await supabase
        .from('calendar_events')
        .update({ related_event_id: result.data.id })
        .eq('id', materialEvent.id)
    }

    return result
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// CALENDAR EVENTS - UPDATE
// =============================================

/**
 * Update a calendar event
 */
export async function updateEvent(
  eventId: string,
  updates: CalendarEventUpdate
): Promise<ApiResponse<CalendarEvent>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error

    // If this event is linked to a material order, update the delivery date
    if (data.material_order_id && updates.event_date) {
      await supabase
        .from('material_orders')
        .update({ expected_delivery_date: updates.event_date })
        .eq('id', data.material_order_id)
    }

    // If this event is linked to a labor order, update the scheduled date
    if (data.labor_order_id && updates.event_date) {
      await supabase
        .from('work_orders')
        .update({ scheduled_date: updates.event_date })
        .eq('id', data.labor_order_id)
    }

    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Reschedule an event to a new date/time
 */
export async function rescheduleEvent(
  eventId: string,
  newDate: string,
  newStartTime?: string | null,
  newEndTime?: string | null
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, {
    event_date: newDate,
    start_time: newStartTime,
    end_time: newEndTime,
    status: EventStatus.RESCHEDULED,
  })
}

/**
 * Cancel an event
 */
export async function cancelEvent(
  eventId: string
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, { status: EventStatus.CANCELLED })
}

/**
 * Complete an event
 */
export async function completeEvent(
  eventId: string
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, { status: EventStatus.COMPLETED })
}

/**
 * Confirm an event
 */
export async function confirmEvent(
  eventId: string
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, { status: EventStatus.CONFIRMED })
}

// =============================================
// CALENDAR EVENTS - DELETE
// =============================================

/**
 * Soft delete a calendar event
 */
export async function deleteEvent(
  eventId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    // First verify we can access this event
    const { data: event, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (fetchError) throw fetchError
    if (!event) throw new Error('Event not found')

    // Now soft delete it
    const { error } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', eventId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Check for event conflicts (overlapping times)
 */
export async function checkEventConflicts(
  userId: string,
  eventDate: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<ApiResponse<{ hasConflicts: boolean; conflicts: any[] }>> {
  try {
    const { data, error } = await supabase.rpc('check_event_conflicts', {
      p_user_id: userId,
      p_event_date: eventDate,
      p_start_time: startTime,
      p_end_time: endTime,
      p_exclude_event_id: excludeEventId || null,
    })

    if (error) throw error

    const result = data?.[0] || { conflict_count: 0, conflicting_events: null }
    
    return {
      data: {
        hasConflicts: result.conflict_count > 0,
        conflicts: result.conflicting_events || [],
      },
      error: null,
    }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Link two related events (e.g., material delivery and labor install)
 */
export async function linkRelatedEvents(
  eventId1: string,
  eventId2: string
): Promise<ApiResponse<void>> {
  try {
    // Update both events to reference each other
    const { error: error1 } = await supabase
      .from('calendar_events')
      .update({ related_event_id: eventId2 })
      .eq('id', eventId1)

    const { error: error2 } = await supabase
      .from('calendar_events')
      .update({ related_event_id: eventId1 })
      .eq('id', eventId2)

    if (error1) throw error1
    if (error2) throw error2

    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}
